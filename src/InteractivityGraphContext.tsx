import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { IInteractivityDeclaration, IInteractivityEvent, IInteractivityGraph, IInteractivityNode, IInteractivityValue, IInteractivityVariable, NodeSpecFlag } from './BasicBehaveEngine/types/InteractivityGraph';
import { createNoOpNode, hasNodeSpecFlag, interactivityNodeSpecs, propagateGraphGroupTypes, resolveOutputSocketType, standardTypes } from './BasicBehaveEngine/types/nodes';
import { v4 as uuidv4 } from 'uuid';
import { Edge, Node } from 'reactflow';
import { DiagnosticCategory, IGraphDiagnostic } from './diagnostics';
import { FLOW_COLOR, getColorForTypeIndex } from './authoring/socketColors';
import { GltfObjectModel } from './authoring/gltfObjectModel';

const edgeStyle = (color: string) => ({ stroke: color, strokeWidth: 2 });

// human-readable label for a standard type index (0=bool, 1=int, 2=float, ...), used to phrase
// load-time spec-validity diagnostics
const typeIndexName = (typeIndex: number | undefined): string =>
    typeIndex === undefined ? "unknown" : (standardTypes[typeIndex]?.name ?? `type#${typeIndex}`);
interface InteractivityGraphContextType {
    graph: IInteractivityGraph,
    needsSyncingToAuthor: boolean,
    setNeedsSyncingToAuthor: (needsSyncing: boolean) => void,
    diagnostics: IGraphDiagnostic[],
    setDiagnosticsForCategory: (category: DiagnosticCategory, diagnostics: IGraphDiagnostic[]) => void,
    clearDiagnostics: () => void,
    // diagnostics + every currently-mounted node's live socket/type warnings (missing values,
    // type mismatches, type-group conflicts - computed per-render in AuthoringGraphNode and
    // reported here via reportNodeWarnings), so the DiagnosticsPanel/DiagnosticsCounter reflect
    // problems introduced by editing the graph in the UI, not just ones found at load time
    allDiagnostics: IGraphDiagnostic[],
    reportNodeWarnings: (nodeUid: string, nodeIndex: number, nodeOp: string | undefined, warnings: string[]) => void,
    gltfObjectModel: GltfObjectModel | null,
    setGltfObjectModel: (model: GltfObjectModel | null) => void,
    supportedPointerTemplates: ReadonlySet<string> | null,
    setSupportedPointerTemplates: (templates: ReadonlySet<string> | null) => void,
    getAuthorGraph: (graph: IInteractivityGraph) => [Node[], Edge[], IInteractivityEvent[], IInteractivityVariable[]],
    getExecutableGraph: () => any,
    loadGraphFromJson: (json: any) => void,
    addDeclaration: (declaration: IInteractivityDeclaration) => void,
    getDeclarationIndex: (op: string) => number,
    addEvent: (event: IInteractivityEvent) => void,
    setEvents: (events: IInteractivityEvent[]) => void,
    addVariable: (variable: IInteractivityVariable) => void,
    setVariables: (variables: IInteractivityVariable[]) => void,
    addNode: (node: IInteractivityNode) => void,
    removeNode: (uid: string) => void
}

const initialGraph: IInteractivityGraph = {
    declarations: [],
    nodes: [],
    events: [],
    variables: [],
    types: standardTypes
};

const initialContext: InteractivityGraphContextType = {
    graph: initialGraph,
    needsSyncingToAuthor: false,
    setNeedsSyncingToAuthor: () => {return null},
    diagnostics: [],
    setDiagnosticsForCategory: () => {return null},
    clearDiagnostics: () => {return null},
    allDiagnostics: [],
    reportNodeWarnings: () => {return null},
    gltfObjectModel: null,
    setGltfObjectModel: () => {return null},
    supportedPointerTemplates: null,
    setSupportedPointerTemplates: () => {return null},
    getAuthorGraph: (graph: IInteractivityGraph) => {return [[], [], [], []]},
    getExecutableGraph: () => {return null},
    loadGraphFromJson: () => {return null},
    addDeclaration: () => {return null},
    getDeclarationIndex: () => -1,
    addEvent: () => {return null},
    setEvents: () => {return null},
    addVariable: () => {return null},
    setVariables: () => {return null},
    addNode: () => {return null},
    removeNode: () => {return null}
};

export const InteractivityGraphContext = createContext<InteractivityGraphContextType>(initialContext);

export const InteractivityGraphProvider = ({ children }: { children: React.ReactNode }) => {
    const usedNodeDeclarationRef = useRef<Set<string>>(new Set());
    const graphRef = useRef<IInteractivityGraph>(initialGraph);

    const [needsSyncingToAuthor, setNeedsSyncingToAuthor] = useState(false);
    const [diagnostics, setDiagnostics] = useState<IGraphDiagnostic[]>([]);

    // Replace all diagnostics belonging to a single category, leaving other categories untouched.
    // This lets independent producers (glb extension checks vs. graph node-op checks) manage their
    // own diagnostics regardless of the order in which they run during a load.
    const setDiagnosticsForCategory = (category: DiagnosticCategory, categoryDiagnostics: IGraphDiagnostic[]) => {
        setDiagnostics(prev => [...prev.filter(d => d.category !== category), ...categoryDiagnostics]);
    };

    const clearDiagnostics = () => {
        setDiagnostics([]);
    };

    // live per-node warnings (missing values, type mismatches, type-group conflicts), keyed by
    // node uid and refreshed every render by that node's own AuthoringGraphNode instance - see
    // reportNodeWarnings below and its call site in AuthoringGraphNode
    const [nodeWarnings, setNodeWarnings] = useState<Record<string, IGraphDiagnostic[]>>({});

    const reportNodeWarnings = useCallback((nodeUid: string, nodeIndex: number, nodeOp: string | undefined, warnings: string[]) => {
        setNodeWarnings(prev => {
            const existing = prev[nodeUid];
            if (warnings.length === 0) {
                if (existing === undefined) { return prev; }
                const next = { ...prev };
                delete next[nodeUid];
                return next;
            }
            // bail out if unchanged so this doesn't retrigger a render loop every frame
            if (existing !== undefined && existing.length === warnings.length && existing.every((d, i) => d.title === warnings[i])) {
                return prev;
            }
            return {
                ...prev,
                [nodeUid]: warnings.map((title) => ({ severity: 'warning', category: 'node', nodeUid, nodeIndex, nodeOp, title })),
            };
        });
    }, []);

    const allDiagnostics = useMemo(
        () => [...diagnostics, ...Object.values(nodeWarnings).flat()],
        [diagnostics, nodeWarnings]
    );

    const [gltfObjectModel, setGltfObjectModel] = useState<GltfObjectModel | null>(null);
    const [supportedPointerTemplates, setSupportedPointerTemplates] = useState<ReadonlySet<string> | null>(null);

    const getAuthorGraph = (graph: IInteractivityGraph): [Node[], Edge[], IInteractivityEvent[], IInteractivityVariable[]] => {
        // TODO: THIS IS NOT JSON WE SHOULD NOT ALLOW FOR NANS OR INFINITIES
        // const graphJson = JSON.parse(graph.replace(/":[ \t](Infinity|-IsNaN)/g, '":"{{$1}}"'), function(k, v) {
        //   if (v === '{{Infinity}}') return Infinity;
        //   else if (v === '{{-Infinity}}') return -Infinity;
        //   else if (v === '{{NaN}}') return NaN;
        //   return v;
        // });  
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const events: IInteractivityEvent[] = graph.events;
        const variables: IInteractivityVariable[] = graph.variables;
      
        // loop through all the nodes in our behave graph to extract nodes and edges
        graph.nodes.forEach((interactivityNode: IInteractivityNode) => {
          // construct and add the node to the nodes list
          const node: Node = {
            id: interactivityNode.uid!,
            type: interactivityNode.op,
            position: {
              x: interactivityNode.metadata?.positionX
                ? Number(interactivityNode.metadata?.positionX)
                : 0,
              y: interactivityNode.metadata?.positionY
                ? Number(interactivityNode.metadata?.positionY)
                : 0,
            },
            data: {} as { [key: string]: any },
          };
          nodes.push(node);
          node.data.uid = interactivityNode.uid;
      
          // add configuration
          node.data.configuration = {}
          if (interactivityNode.configuration) {
            for (const [key, value] of Object.entries(interactivityNode.configuration)) {
              node.data.configuration[key] = value;
            }
          }
      
          //add custom events and variables
          node.data.events = graph.events;
          node.data.variables = graph.variables;
          node.data.types = graph.types;
      
          // to keep track of if there is a link for this value
          node.data.linked = {}
          node.data.values = {}
          if (interactivityNode.values) {
            for (const [key, value] of Object.entries(interactivityNode.values.input || {})) {
              if (value.node !== undefined) {
                // if the value is derived from the output of another node, create an edge linking to that node
                // color the edge by the source output socket's data type
                const sourceNode = graph.nodes.find(n => n.uid === value.node);
                const sourceType = resolveOutputSocketType(sourceNode, value.socket!, graph.nodes);
                edges.push({
                  id: uuidv4(),
                  source: String(value.node),
                  sourceHandle: value.socket,
                  target: String(interactivityNode.uid!),
                  targetHandle: key,
                  style: edgeStyle(getColorForTypeIndex(sourceType)),
                });
                node.data.linked[key] = true;
              } else if (value.value !== undefined) {
                // if the value is a value, we can just get it from the node json
                node.data.values[key] = {value: value.value, type: value.type};
              }
            }
          }
      
          // flows will always be references to other nodes output flows, so for each flow create a backreference edge
          node.data.flowIds = [];
          if (interactivityNode.flows) {
            for (const [key, value] of Object.entries(interactivityNode.flows?.output || {})) {
              if (value.node !== undefined) {
              edges.push({
                id: uuidv4(),
                source: String(interactivityNode.uid!),
                sourceHandle: key,
                target: String(value.node),
                  targetHandle: value.socket,
                  style: edgeStyle(FLOW_COLOR),
                });
              }
            }
          }
        });
      
        // set up structure for nodes if one does not exist
        if (!nodes.some(node => node.position.y !== 0 || node.position.x !== 0)) {
          // Build adjacency list
          const adjacencyList: Record<string, string[]> = {};
          edges.forEach((edge) => {
            const { source, target } = edge;
            if (!adjacencyList[source]) {
              adjacencyList[source] = [];
            }
            if (!adjacencyList[target]) {
              adjacencyList[target] = [];
            }
            adjacencyList[source].push(target);
            adjacencyList[target].push(source);
          });
      
          const visited: Record<string, boolean> = {};
          const disjointGraphs: string[][] = [];
          const queue: string[] = [];
      
          // Traverse graph and assign disjointGraphs
          nodes.forEach((node) => {
            const { id } = node;
            if (!visited[id]) {
              visited[id] = true;
              const disjointGraph: string[] = [];
              queue.push(id);
      
              while (queue.length > 0) {
                const currentNode = queue.shift() as string;
                disjointGraph.push(currentNode);
      
                if (adjacencyList[currentNode]) {
                  adjacencyList[currentNode].forEach((neighbor) => {
                    if (!visited[neighbor]) {
                      visited[neighbor] = true;
                      queue.push(neighbor);
                    }
                  });
                }
              }
      
              disjointGraphs.push(disjointGraph);
            }
          });
      
            // Y layer additive reflects the Y to start each new graph at. Should start with 0, and then on a subsequent disjoint graph, add some padding + the last max y.
            let layerYAdditive = 0;
            let lastMaxY = 0;
      
            console.log("DISJOINT GRAPHS");
            console.log(disjointGraphs);
            disjointGraphs.forEach((disjointGraph) => {  
              // Each layer is a vertical column of a disjoint graph. Since we start at the leftmost column where x = -500 (starting point).
              let lastLayer: string[] = disjointGraph.filter(nodeId => !edges.some(edge => edge.target === nodeId));
              let y = 0;
              for (let i = 0; i < lastLayer.length; i++) {
                const node = nodes.find(node => node.id === lastLayer[i])!;
                node.position.x = -500;
                y = 500 * i + layerYAdditive;
                node.position.y = y;
                if (y > lastMaxY) {
                  lastMaxY = y;
                }
              }
      
              let nextLayer: string[] = [];
              for (const nodeId of lastLayer) {
                const nodeOutEdges: Edge[] = edges.filter(edge => edge.source === nodeId);
                nextLayer.push(...nodeOutEdges.map(edge => edge.target));
              }
              nextLayer = [...new Set(nextLayer)];
      
              let xOffset = 0;
              while (nextLayer.length > 0) {
                lastLayer = nextLayer;
                for (let i = 0; i < lastLayer.length; i++) {
                  const node = nodes.find(node => node.id === lastLayer[i])!;
                  node.position.x = xOffset;
                  y = 500 * i + layerYAdditive;
                  node.position.y = y;
                  if (y > lastMaxY) {
                    lastMaxY = y;
                  }
                }
      
                nextLayer = [];
                for (const nodeId of lastLayer) {
                  const nodeOutEdges: Edge[] = edges.filter(edge => edge.source === nodeId);
                  nextLayer.push(...nodeOutEdges.map(edge => edge.target));
                }
                nextLayer = [...new Set(nextLayer)];
                xOffset += 500;
              }
              layerYAdditive = 800 + lastMaxY;
          });
      
      
        }
      
        return [nodes, edges, events, variables];
      };

    const getUpdatedTypeIndex = (oldType: {signature: string, extensions?: any}): number => {
      const oldTypeSignature = oldType.signature;
      if (oldTypeSignature === "custom") {
        const typeExtensions = JSON.stringify(Object.keys(oldType.extensions || {}).sort())
        return standardTypes.findIndex(type => type.signature === "custom" && JSON.stringify(Object.keys(type.extensions).sort()) == typeExtensions)
      } else {
        return standardTypes.findIndex(type => type.signature === oldTypeSignature);
      }
    }

    // human-readable label for a graph type entry (custom types are identified by their extension key)
    const getTypeLabel = (type: {signature: string, extensions?: any}): string => {
      if (type.signature === "custom") {
        const extensionKeys = Object.keys(type.extensions || {});
        return extensionKeys.length > 0 ? extensionKeys.join(", ") : "custom";
      }
      return type.signature;
    }
    const loadGraphFromJson = (json: any) => {
        const graph: IInteractivityGraph = {
            declarations: json.declarations,
            nodes: [],
            variables: json.variables,
            events: json.events,
            types: standardTypes
        };

        // surface any graph data types this tool does not recognise (mapped to an invalid -1 index)
        const unsupportedTypes = new Set<string>();
        if (Array.isArray(json.types)) {
            for (const type of json.types) {
                if (getUpdatedTypeIndex(type) === -1) {
                    unsupportedTypes.add(getTypeLabel(type));
                }
            }
        }
        const typeDiagnostics: IGraphDiagnostic[] = [...unsupportedTypes].map((label) => ({
            severity: 'warning',
            category: 'type',
            title: `Unsupported data type: ${label}`,
            detail: `This graph declares the data type "${label}", which this tool does not recognise. Values using it may not display or execute correctly.`,
        }));
        setDiagnosticsForCategory('type', typeDiagnostics);

        // translate the types to be the standard types
        for (const declaration of graph.declarations) {
            if (declaration.inputValueSockets) {
                for (const socket of Object.values(declaration.inputValueSockets)) {
                  socket.type = getUpdatedTypeIndex(json.types[socket.type]);
                }
            }
            if (declaration.outputValueSockets) {
                for (const socket of Object.values(declaration.outputValueSockets)) {
                    socket.type = getUpdatedTypeIndex(json.types[socket.type]);
                }
            }
        } 
        
        if (graph.variables) {
            for (const variable of graph.variables) {
                variable.type = getUpdatedTypeIndex(json.types[variable.type]);
            }
        }

        if (graph.events) {
          for (const event of graph.events) {
            for (const socket of Object.values(event.values)) {
              socket.type = getUpdatedTypeIndex(json.types[socket.type]);
            }
          }
        }


        const loadedNodes: IInteractivityNode[] = [];
        const uuids = [];
        // track unsupported node operations (op -> number of nodes using it) so we can surface them
        const unsupportedOps = new Map<string, number>();
        // per-node spec-validity diagnostics (unknown socket names / socket type mismatches
        // against this op's declaration in nodes.ts) - not KHR_interactivity spec compliance of
        // the file overall, but of the individual node instances within it
        const nodeDiagnostics: IGraphDiagnostic[] = [];
        for (let i = 0; i < json.nodes.length; i++) {
            uuids.push(uuidv4());
        }
        for (let i = 0; i < json.nodes.length; i++) {
            const node = json.nodes[i];
            const nodeOp = json.declarations[node.declaration].op;
            let isNoOp = false;
            let templateNode: IInteractivityNode | undefined = interactivityNodeSpecs.find((schema: IInteractivityNode) => schema.op === nodeOp);
            if (templateNode === undefined) {
                templateNode = createNoOpNode(json.declarations[node.declaration]);
                isNoOp = true;
                unsupportedOps.set(nodeOp, (unsupportedOps.get(nodeOp) ?? 0) + 1);
            }
            
            const copyOfTemplateNode: IInteractivityNode = JSON.parse(JSON.stringify(templateNode));

            copyOfTemplateNode.uid = uuids[i];
            copyOfTemplateNode.declaration = node.declaration;

            // an op whose spec doesn't carry the DynamicSockets flag has a fixed socket set, so
            // any socket name in the file that isn't declared on the matched spec is either a
            // typo or a hand-authored graph that isn't spec-compliant for this op
            const allowsDynamicSockets = isNoOp || hasNodeSpecFlag(templateNode, NodeSpecFlag.DynamicSockets);

            if (node.values !== undefined) {
                for (const key in node.values) {
                    if (node.values[key].value !== undefined) {
                        copyOfTemplateNode.values = copyOfTemplateNode.values || {};
                        copyOfTemplateNode.values.input = copyOfTemplateNode.values.input || {};
                        const newTypeIndex = getUpdatedTypeIndex(json.types[node.values[key].type]);
                        const specSocket = templateNode.values?.input?.[key];
                        if (!isNoOp && specSocket === undefined && !allowsDynamicSockets) {
                            nodeDiagnostics.push({
                                severity: 'error', category: 'node', nodeUid: uuids[i], nodeIndex: i, nodeOp,
                                title: `Unknown input value socket "${key}"`,
                                detail: `"${nodeOp}" does not declare an input value socket named "${key}" in the interactivity spec.`,
                            });
                        } else if (!isNoOp && specSocket?.typeOptions !== undefined && !specSocket.typeOptions.includes(newTypeIndex)) {
                            nodeDiagnostics.push({
                                severity: 'error', category: 'node', nodeUid: uuids[i], nodeIndex: i, nodeOp,
                                title: `Type mismatch on input socket "${key}"`,
                                detail: `Socket "${key}" is set to type ${typeIndexName(newTypeIndex)}, but "${nodeOp}" expects ${specSocket.typeOptions.map(typeIndexName).join(" | ")}.`,
                            });
                        }
                        copyOfTemplateNode.values.input[key] = {value: node.values[key].value, type: newTypeIndex, typeOptions: copyOfTemplateNode.values.input[key]?.typeOptions || [newTypeIndex]};
                    } else if (node.values[key].socket !== undefined && node.values[key].node !== null) {
                        copyOfTemplateNode.values = copyOfTemplateNode.values || {};
                        copyOfTemplateNode.values.input = copyOfTemplateNode.values.input || {};
                        if (!isNoOp && templateNode.values?.input?.[key] === undefined && !allowsDynamicSockets) {
                            nodeDiagnostics.push({
                                severity: 'error', category: 'node', nodeUid: uuids[i], nodeIndex: i, nodeOp,
                                title: `Unknown input value socket "${key}"`,
                                detail: `"${nodeOp}" does not declare an input value socket named "${key}" in the interactivity spec.`,
                            });
                        }
                        copyOfTemplateNode.values.input[key] = {socket: node.values[key].socket, node: uuids[node.values[key].node]};
                    }
                }
            }

            if (node.flows !== undefined && !isNoOp) {
                for (const key in node.flows) {
                    copyOfTemplateNode.flows = copyOfTemplateNode.flows || {};
                    copyOfTemplateNode.flows.output = copyOfTemplateNode.flows.output || {};
                    if (templateNode.flows?.output?.[key] === undefined && !allowsDynamicSockets) {
                        nodeDiagnostics.push({
                            severity: 'error', category: 'node', nodeUid: uuids[i], nodeIndex: i, nodeOp,
                            title: `Unknown output flow socket "${key}"`,
                            detail: `"${nodeOp}" does not declare an output flow socket named "${key}" in the interactivity spec.`,
                        });
                    }
                    copyOfTemplateNode.flows.output[key] = {socket: node.flows[key].socket, node: uuids[node.flows[key].node]};
                }
            }

            if (node.configuration !== undefined && !isNoOp) {
                for (const key in node.configuration) {
                    copyOfTemplateNode.configuration = copyOfTemplateNode.configuration || {};
                    copyOfTemplateNode.configuration[key] = node.configuration[key];
                    if (key === "type") {
                      const newTypeIndex = getUpdatedTypeIndex(json.types[node.configuration[key].value[0]])
                      copyOfTemplateNode.configuration[key].value = [newTypeIndex];
                    }
                }
            }

            if (node.metadata !== undefined) {
                copyOfTemplateNode.metadata = {
                    positionX: node.metadata?.positionX,
                    positionY: node.metadata?.positionY
                }
            }

            loadedNodes.push(copyOfTemplateNode);
        }

        graph.nodes = loadedNodes;

        // The loader fills input sockets straight from the file and leaves outputs (and any input the
        // file omitted) at the spec default, so grouped sockets — e.g. a math node's `a`/`b`/output
        // sharing type `T` — can be left inconsistent (output/omitted input stuck at the default
        // `int` while the group actually resolves to `float`). The interactive connect / type paths
        // keep these in sync as the user edits, but nothing runs on load; do it explicitly here so
        // stored types match the resolved type (no spurious type-group warnings, correct exports).
        propagateGraphGroupTypes(graph.nodes);

        graphRef.current = graph;

        // surface any node operations this tool does not implement (loaded as inert NoOp nodes)
        const opDiagnostics: IGraphDiagnostic[] = [...unsupportedOps.entries()].map(([op, count]) => ({
            severity: 'warning',
            category: 'operation',
            title: `Unsupported node operation: ${op}`,
            detail: `${count} node${count > 1 ? 's' : ''} in this graph use "${op}", which this tool does not implement. ${count > 1 ? 'They are' : 'It is'} shown as a NoOp node and will not execute.`,
        }));
        setDiagnosticsForCategory('operation', opDiagnostics);
        setDiagnosticsForCategory('node', nodeDiagnostics);

        setNeedsSyncingToAuthor(true);
    }


    const getExecutableGraph = () => {
        const graph: any = { declarations: [], nodes: [], variables: [], events: [], types: standardTypes};

        graph.events = [...graphRef.current.events || []];
        graph.variables = [...graphRef.current.variables || []];
        graph.declarations = [...graphRef.current.declarations || []];
        for (const node of graphRef.current.nodes) {

            // Create stripped values object without typeOptions
            const strippedValues: Record<string, IInteractivityValue> = {};
            Object.entries(node.values?.input || {}).forEach(([key, value]) => {
                strippedValues[key] = {...value, typeOptions: undefined};
            });

            const behaveNode: any = {
                id: node.uid,
                declaration: graph.declarations.findIndex((declaration: IInteractivityDeclaration) => declaration.op === node.op),
                values: strippedValues,
                configuration: node.configuration || {},
                flows: node.flows?.output || {},
                metadata: node.metadata
            };

            graph.nodes.push(JSON.parse(JSON.stringify(behaveNode)));
        }

        topologicalSort(graph.nodes);

        return graph;
    };

    const topologicalSort = (nodes: any[]) => {
        const sortedList = [];
    
        // create degree map
        const nodeIdToInDegree = new Map();
        for (const node of nodes) {
            nodeIdToInDegree.set(node.id, 0);
            node.fakeLinks = [];
        }
    
        // put data in degree map
        for (const node of nodes) {
            // for flow references, increase referenced node's in degree
            if (node.flows !== undefined) {
                const outFlowIds = Object.values(node.flows).map((flow: any) => flow.node).filter((id: any) => id !== undefined);
                for (const outflowId of outFlowIds) {
                    nodeIdToInDegree.set(outflowId, nodeIdToInDegree.get(outflowId) + 1);
                }
            }
            // for value links, increase your own in degree
            if (node.values !== undefined) {
                const valueBackRefNodeIds = Object.values(node.values)
                    .filter((val: any) => val.node !== undefined)
                    .map((val: any) => val.node);
                // create fakeLinks so we know to decrement the link in degree when we remove it
                for (const valueBackRefNodeId of valueBackRefNodeIds) {
                    nodeIdToInDegree.set(node.id, nodeIdToInDegree.get(node.id) + 1);
                    const referencedNode = nodes.find(n => n.id === valueBackRefNodeId);
                    referencedNode.fakeLinks.push(node.id);
                }
            }
    
        }
    
        //create queue
        const queue = nodes.filter(node => nodeIdToInDegree.get(node.id) === 0);
    
        //run top sort algo
        while (queue.length > 0) {
            const curNode = queue.pop();
            if (curNode === undefined) {return}
            sortedList.push(curNode);
    
            //values
            const outIds = curNode.fakeLinks;
    
            // flows
            if (curNode.flows !== undefined) {
                const outFlowIds = Object.values(curNode.flows).map((flow: any) => flow.node);
                outIds.push(...outFlowIds);
            }
    
            for (const outId of outIds) {
                nodeIdToInDegree.set(outId, nodeIdToInDegree.get(outId) - 1);
                if (nodeIdToInDegree.get(outId) === 0) {
                    const nodeToPush: Node = nodes.find(node => node.id === outId)!;
                    queue.push(nodeToPush);
                }
            }
        }
    
        // validate no cycle
        if (sortedList.length !== nodes.length) {
            throw Error("Cycle Detected");
        }
    
        const oldIdToTopologicalId = new Map();
        for (let i = 0; i < sortedList.length; i++) {
            oldIdToTopologicalId.set(sortedList[i].id, i);
        }
    
        // change nodeIds in graph
        for (const node of nodes) {
            node.id = Number(`${oldIdToTopologicalId.get(node.id)}`);
            if (node.flows !== undefined) {
                Object.values(node.flows).forEach((flow: any) => {
                    if (flow.node !== undefined && oldIdToTopologicalId.get(flow.node) !== undefined) {
                        flow.node = Number(`${oldIdToTopologicalId.get(flow.node)}`);
                    }
                })
            }
            if (node.values !== undefined) {
                Object.values(node.values).forEach((val: any) => {
                    if (val.node !== undefined && oldIdToTopologicalId.get(val.node) !== undefined) {
                        val.node = Number(`${oldIdToTopologicalId.get(val.node)}`);
                    }
                })
            }
        }
    
        nodes.sort((a, b) => {return a.id - b.id});
    
        // remove fake Links
        for (const node of nodes) {
            delete node.fakeLinks;
            delete node.id;
        }
    }

    const addDeclaration = (declaration: IInteractivityDeclaration) => {
        if (usedNodeDeclarationRef.current.has(declaration.op)) {
            return;
        }
        graphRef.current.declarations.push(declaration);
        usedNodeDeclarationRef.current.add(declaration.op);
    };

    const getDeclarationIndex = (op: string): number => {
        return graphRef.current.declarations.findIndex(declaration => declaration.op === op);
    };

    const addEvent = (event: IInteractivityEvent) => {
        graphRef.current.events.push(event);
    };

    // Replace the whole custom-event list. Used by the Custom Events editor, which manages
    // add/edit/delete of events locally and commits the resulting array back in one call.
    const setEvents = (events: IInteractivityEvent[]) => {
        graphRef.current.events = events;
    };

    const addVariable = (variable: IInteractivityVariable) => {
        graphRef.current.variables.push(variable);
    };

    // Replace the whole variable list. Used by the Variables editor, which manages
    // add/edit/delete of variables locally and commits the resulting array back in one call.
    const setVariables = (variables: IInteractivityVariable[]) => {
        graphRef.current.variables = variables;
    };

    const addNode = (node: IInteractivityNode) => {
        graphRef.current.nodes.push(node);
    };

    const removeNode = (uid: string) => {
        graphRef.current.nodes = graphRef.current.nodes.filter(node => node.uid !== uid);
    };

    const context: InteractivityGraphContextType = {
        graph: graphRef.current,
        needsSyncingToAuthor: needsSyncingToAuthor,
        setNeedsSyncingToAuthor: setNeedsSyncingToAuthor,
        diagnostics: diagnostics,
        setDiagnosticsForCategory: setDiagnosticsForCategory,
        clearDiagnostics: clearDiagnostics,
        allDiagnostics: allDiagnostics,
        reportNodeWarnings: reportNodeWarnings,
        gltfObjectModel: gltfObjectModel,
        setGltfObjectModel: setGltfObjectModel,
        supportedPointerTemplates: supportedPointerTemplates,
        setSupportedPointerTemplates: setSupportedPointerTemplates,
        getAuthorGraph: getAuthorGraph,
        loadGraphFromJson: loadGraphFromJson,
        getExecutableGraph: getExecutableGraph,
        addDeclaration: addDeclaration,
        getDeclarationIndex: getDeclarationIndex,
        addEvent: addEvent,
        setEvents: setEvents,
        addVariable: addVariable,
        setVariables: setVariables,
        addNode: addNode,
        removeNode: removeNode
    };

    return <InteractivityGraphContext.Provider value={context}>{children}</InteractivityGraphContext.Provider>;
};
