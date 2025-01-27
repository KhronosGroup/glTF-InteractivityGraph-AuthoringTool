import { createContext, useRef, useState } from 'react';
import { IInteractivityDeclaration, IInteractivityEvent, IInteractivityGraph, IInteractivityNode, IInteractivityVariable } from './types/InteractivityGraph';
import { createNoOpNode, interactivityNodeSpecs, standardTypes } from './types/nodes';
import { v4 as uuidv4 } from 'uuid';
import { Edge, Node } from 'reactflow';
interface InteractivityGraphContextType {
    graph: IInteractivityGraph,
    needsSyncingToAuthor: boolean,
    setNeedsSyncingToAuthor: (needsSyncing: boolean) => void,
    getAuthorGraph: (graph: IInteractivityGraph) => [Node[], Edge[], IInteractivityEvent[], IInteractivityVariable[]],
    getExecutableGraph: () => any,
    loadGraphFromJson: (json: any) => void,
    addDeclaration: (declaration: IInteractivityDeclaration) => void,
    getDeclarationIndex: (op: string) => number,
    addEvent: (event: IInteractivityEvent) => void,
    addVariable: (variable: IInteractivityVariable) => void,
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
    getAuthorGraph: (graph: IInteractivityGraph) => {return [[], [], [], []]},
    getExecutableGraph: () => {return null},
    loadGraphFromJson: () => {return null},
    addDeclaration: () => {return null},
    getDeclarationIndex: () => -1,
    addEvent: () => {return null},
    addVariable: () => {return null},
    addNode: () => {return null},
    removeNode: () => {return null}
};

export const InteractivityGraphContext = createContext<InteractivityGraphContextType>(initialContext);

export const InteractivityGraphProvider = ({ children }: { children: React.ReactNode }) => {
    const usedNodeDeclarationRef = useRef<Set<string>>(new Set());
    const graphRef = useRef<IInteractivityGraph>(initialGraph);

    const [needsSyncingToAuthor, setNeedsSyncingToAuthor] = useState(false);

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
                edges.push({
                  id: uuidv4(),
                  source: String(value.node),
                  sourceHandle: value.socket,
                  target: String(interactivityNode.uid!),
                  targetHandle: key,
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
      
            disjointGraphs.forEach((disjointGraph) => {
              const nodeNumbers: number[] = [];
              disjointGraph.forEach((nodeId) => {
                const i = nodes.findIndex((n) => n.id === nodeId);
                if (i < 0) {
                  console.error(`Node with id ${nodeId} not found in nodes list. This is likely an issue with the graph data.`);
                }
                else {
                  nodeNumbers.push(i);
                }
              });
      
              // Each layer is a vertical column of a disjoint graph. Since we start at the leftmost column where x = -500 (starting point).
              let lastLayer: number[] = nodeNumbers.filter(num => !edges.some(edge => Number(edge.target) === num));
              let y = 0;
              for (let i = 0; i < lastLayer.length; i++) {
                nodes[lastLayer[i]].position.x = -500;
                y = 500 * i + layerYAdditive;
                nodes[lastLayer[i]].position.y = y;
                if (y > lastMaxY) {
                  lastMaxY = y;
                }
              }
      
              let nextLayer: number[] = [];
              for (const nodeIndex of lastLayer) {
                const nodeOutEdges: Edge[] = edges.filter(edge => Number(edge.source) === nodeIndex);
                nextLayer.push(...nodeOutEdges.map(edge => Number(edge.target)));
              }
              nextLayer = [...new Set(nextLayer.filter(num => Number.isFinite(num)))];
      
              let xOffset = 0;
              while (nextLayer.length > 0) {
                lastLayer = nextLayer;
                for (let i = 0; i < lastLayer.length; i++) {
                  nodes[lastLayer[i]].position.x = xOffset;
                  y = 500 * i + layerYAdditive;
                  nodes[lastLayer[i]].position.y = y;
                  if (y > lastMaxY) {
                    lastMaxY = y;
                  }
                }
      
                nextLayer = [];
                for (const nodeIndex of lastLayer) {
                  const nodeOutEdges: Edge[] = edges.filter(edge => Number(edge.source) === nodeIndex);
                  nextLayer.push(...nodeOutEdges.map(edge => Number(edge.target)));
                }
                nextLayer = [...new Set(nextLayer.filter(num => Number.isFinite(num)))];
                xOffset += 500;
              }
              layerYAdditive = 800 + lastMaxY;
          });
      
      
        }
      
        return [nodes, edges, events, variables];
      };

    const loadGraphFromJson = (json: any) => {
        const graph: IInteractivityGraph = {
            declarations: json.declarations,
            nodes: [],
            variables: json.variables,
            events: json.events,
            types: json.types
        };

        const loadedNodes: IInteractivityNode[] = [];
        const uuids = [];
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
            }

            templateNode.uid = uuids[i];
            templateNode.declaration = node.declaration;

            if (node.values !== undefined) {
                for (const key in node.values) {
                    if (node.values[key].value !== undefined) {
                        templateNode.values = templateNode.values || {};
                        templateNode.values.input = templateNode.values.input || {};
                        templateNode.values.input[key] = {value: node.values[key].value, type: node.values[key].type, typeOptions: templateNode.values.input[key]?.typeOptions || [node.values[key].type]};
                    } else if (node.values[key].socket !== undefined && node.values[key].node !== null) {
                        templateNode.values = templateNode.values || {};
                        templateNode.values.input = templateNode.values.input || {};
                        templateNode.values.input[key] = {socket: node.values[key].socket, node: uuids[node.values[key].node]};
                    }
                }
            }

            if (node.flows !== undefined && !isNoOp) {
                for (const key in node.flows) {
                    templateNode.flows = templateNode.flows || {};
                    templateNode.flows.output = templateNode.flows.output || {};
                    templateNode.flows.output[key].socket = node.flows[key].socket;
                    templateNode.flows.output[key].node = uuids[node.flows[key].node];
                }
            }

            if (node.configuration !== undefined && !isNoOp) {
                for (const key in node.configuration) {
                    templateNode.configuration = templateNode.configuration || {};
                    templateNode.configuration[key] = node.configuration[key];
                }
            }

            if (node.metadata !== undefined) {
                templateNode.metadata = {
                    positionX: node.metadata?.positionX,
                    positionY: node.metadata?.positionY
                }
            }

            loadedNodes.push(templateNode);
        }

        graph.nodes = loadedNodes;
        graphRef.current = graph;
        setNeedsSyncingToAuthor(true);
    }


    const getExecutableGraph = () => {
        const graph: any = { declarations: [], nodes: [], variables: [], events: [], types: standardTypes, };

        graph.events = [...graphRef.current.events];
        graph.variables = [...graphRef.current.variables];
        graph.declarations = [...graphRef.current.declarations];
        for (const node of graphRef.current.nodes) {

            const behaveNode: any = {
                id: node.uid,
                declaration: graph.declarations.findIndex((declaration: IInteractivityDeclaration) => declaration.op === node.op),
                values: node.values?.input || {},
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

    const addVariable = (variable: IInteractivityVariable) => {
        graphRef.current.variables.push(variable);
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
        getAuthorGraph: getAuthorGraph,
        loadGraphFromJson: loadGraphFromJson,
        getExecutableGraph: getExecutableGraph,
        addDeclaration: addDeclaration,
        getDeclarationIndex: getDeclarationIndex,
        addEvent: addEvent,
        addVariable: addVariable,
        addNode: addNode,
        removeNode: removeNode
    };

    return <InteractivityGraphContext.Provider value={context}>{children}</InteractivityGraphContext.Provider>;
};
