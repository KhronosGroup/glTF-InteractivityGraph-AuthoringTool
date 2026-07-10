import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { IInteractivityDeclaration, IInteractivityEvent, IInteractivityGraph, IInteractivityVariable } from './BasicBehaveEngine/types/InteractivityGraph';
import { AuthoredGraph, AuthoredNode, AuthoredValue, NodeSpecFlag } from './authoring/spec/AuthoredGraph';
import { createNoOpNode, hasNodeSpecFlag, interactivityNodeSpecs, resolveOutputSocketType, standardTypes } from './authoring/spec/nodes';
import { computeConfigDrivenSockets } from './authoring/socketReconciler';
import { v4 as uuidv4 } from 'uuid';
import { Edge, Node } from 'reactflow';
import { DiagnosticCategory, IGraphDiagnostic } from './diagnostics';
import { FLOW_COLOR, UNKNOWN_COLOR, getColorForTypeIndex } from './authoring/socketColors';
import { GltfObjectModel } from './authoring/gltfObjectModel';
import { runChunked, isAbortError } from './utils/frameBudget';
import { ensureInteractivityDeclaration } from './authoring/declarations';
import { toExecutableConfigurationValue, toExecutableValue } from './authoring/executableGraph';

const edgeStyle = (color: string) => ({ stroke: color, strokeWidth: 2 });

// human-readable label for a standard type index (0=bool, 1=int, 2=float, ...), used to phrase
// load-time spec-validity diagnostics
const typeIndexName = (typeIndex: number | undefined): string =>
    typeIndex === undefined ? "unknown" : (standardTypes[typeIndex]?.name ?? `type#${typeIndex}`);

// Progress of an in-flight chunked graph load, surfaced to the LoadingProgressBar. `step` is the
// current phase label (Reading graph -> Building nodes -> ... -> Checking) and `progress` is 0..1
// within/across those phases. null when no load is running.
export interface LoadingState {
    active: boolean;
    step: string;
    progress: number;
}

export interface GetAuthorGraphOptions {
    // When true, value edges are emitted in the neutral UNKNOWN_COLOR and resolveOutputSocketType is
    // skipped, so a big graph can build its canvas before the (deferred) type-propagation pass runs;
    // the wires are recolored to their resolved type colors afterwards (see AuthoringComponent). When
    // false (default) edges resolve their real type color immediately, as on an interactive edit.
    deferTypes?: boolean;
}

interface InteractivityGraphContextType {
    // The editor's single source of truth. Interactive edits mutate this object in place (they
    // don't trigger a context re-render — the reactflow canvas owns its own visual state); a graph
    // *load* replaces its identity via setGraph, which is what drives the canvas rebuild.
    graph: AuthoredGraph,
    diagnostics: IGraphDiagnostic[],
    setDiagnosticsForCategory: (category: DiagnosticCategory, diagnostics: IGraphDiagnostic[]) => void,
    clearDiagnostics: () => void,
    // diagnostics + every currently-mounted node's live socket/type warnings (missing values,
    // type mismatches, type-group conflicts - computed per-render in AuthoringGraphNode and
    // reported here via reportNodeWarnings), so the DiagnosticsPanel/DiagnosticsCounter reflect
    // problems introduced by editing the graph in the UI, not just ones found at load time
    allDiagnostics: IGraphDiagnostic[],
    reportNodeWarnings: (nodeUid: string, nodeIndex: number, nodeOp: string | undefined, warnings: string[]) => void,
    // Progress of the current chunked load (null when idle). Drives the LoadingProgressBar.
    loadingState: LoadingState | null,
    setLoadingState: (state: LoadingState | null) => void,
    // While true, live per-node warnings are buffered instead of committed so the hundreds of nodes
    // mounting during a load don't each trigger a context setState. Flushed once on unpause.
    diagnosticsPaused: boolean,
    setDiagnosticsPaused: (paused: boolean) => void,
    gltfObjectModel: GltfObjectModel | null,
    setGltfObjectModel: (model: GltfObjectModel | null) => void,
    supportedPointerTemplates: ReadonlySet<string> | null,
    setSupportedPointerTemplates: (templates: ReadonlySet<string> | null) => void,
    getAuthorGraph: (graph: AuthoredGraph, options?: GetAuthorGraphOptions) => [Node[], Edge[], IInteractivityEvent[], IInteractivityVariable[]],
    // The single sanctioned Authoring -> Engine coupling point: projects the editor's AuthoredGraph
    // down to a runtime IInteractivityGraph (topologically sorted) for BasicBehaveEngine. Data flows
    // one way; the engine never reads the AuthoredGraph.
    getExecutableGraph: () => IInteractivityGraph,
    loadGraphFromJson: (json: any) => void,
    addDeclaration: (declaration: IInteractivityDeclaration) => number,
    addEvent: (event: IInteractivityEvent) => void,
    setEvents: (events: IInteractivityEvent[]) => void,
    addVariable: (variable: IInteractivityVariable) => void,
    setVariables: (variables: IInteractivityVariable[]) => void,
    addNode: (node: AuthoredNode) => void,
    removeNode: (uid: string) => void,
    // Whether the graph has structural edits (sockets, wiring, nodes, events, variables — not
    // node drag position) made since the runtime engine last loaded it. Drives the "Reload" nudge
    // in the authoring menu bar, since edits don't auto-propagate to the running scene.
    graphDirty: boolean,
    markGraphDirty: () => void,
    clearGraphDirty: () => void,
    // Lets whichever engine view is currently mounted (Babylon/Logging) register its own "Play"
    // action, so the authoring menu bar's Reload button can trigger a re-run without needing a
    // direct reference to that component.
    registerPlayHandler: (handler: (() => void) | null) => void,
    requestPlay: () => void,
}

// The provider's starting graph. Identity matters: the authoring canvas treats "graph is still
// this exact object" as "nothing has been loaded yet" and skips the rebuild (interactive edits
// mutate it in place; only a load replaces it via setGraph).
export const initialGraph: AuthoredGraph = {
    declarations: [],
    nodes: [],
    events: [],
    variables: [],
    types: standardTypes
};

const initialContext: InteractivityGraphContextType = {
    graph: initialGraph,
    diagnostics: [],
    setDiagnosticsForCategory: () => {return null},
    clearDiagnostics: () => {return null},
    allDiagnostics: [],
    reportNodeWarnings: () => {return null},
    loadingState: null,
    setLoadingState: () => {return null},
    diagnosticsPaused: false,
    setDiagnosticsPaused: () => {return null},
    gltfObjectModel: null,
    setGltfObjectModel: () => {return null},
    supportedPointerTemplates: null,
    setSupportedPointerTemplates: () => {return null},
    getAuthorGraph: (graph: AuthoredGraph, options?: GetAuthorGraphOptions) => {return [[], [], [], []]},
    getExecutableGraph: () => ({ declarations: [], nodes: [], types: [], events: [], variables: [] }),
    loadGraphFromJson: () => {return null},
    addDeclaration: () => -1,
    addEvent: () => {return null},
    setEvents: () => {return null},
    addVariable: () => {return null},
    setVariables: () => {return null},
    addNode: () => {return null},
    removeNode: () => {return null},
    graphDirty: false,
    markGraphDirty: () => {return null},
    clearGraphDirty: () => {return null},
    registerPlayHandler: () => {return null},
    requestPlay: () => {return null}
};

export const InteractivityGraphContext = createContext<InteractivityGraphContextType>(initialContext);

export const InteractivityGraphProvider = ({ children }: { children: React.ReactNode }) => {
    // The graph model is React state so a *load* (setGraph) changes its identity and the authoring
    // canvas can rebuild off that; interactive edits keep mutating this same object in place (no
    // setGraph) exactly as before, so they don't force a context re-render.
    const [graph, setGraph] = useState<AuthoredGraph>(initialGraph);
    // last cycle state we surfaced as a diagnostic. getExecutableGraph runs during render (JSON
    // view), so we guard on this ref and defer the setState to avoid an update-during-render loop.
    const cycleReportedRef = useRef<boolean>(false);

    // See graphDirty on the context type: true once a structural edit has been made since the
    // engine last (re)loaded the graph.
    const [graphDirty, setGraphDirty] = useState(false);
    const markGraphDirty = useCallback(() => setGraphDirty(true), []);
    const clearGraphDirty = useCallback(() => setGraphDirty(false), []);

    const playHandlerRef = useRef<(() => void) | null>(null);
    const registerPlayHandler = useCallback((handler: (() => void) | null) => {
        playHandlerRef.current = handler;
    }, []);
    const requestPlay = useCallback(() => {
        playHandlerRef.current?.();
    }, []);

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

    // Loading progress + diagnostics pause. The pause is mirrored into a ref so the stable
    // reportNodeWarnings callback can read the current value without being recreated. While paused,
    // node warnings accumulate in pendingNodeWarningsRef (null value = "clear this uid") and are
    // committed in one setState when setDiagnosticsPaused(false) flushes them.
    const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
    const [diagnosticsPaused, setDiagnosticsPausedState] = useState(false);
    const diagnosticsPausedRef = useRef(false);
    const pendingNodeWarningsRef = useRef<Map<string, IGraphDiagnostic[] | null>>(new Map());

    const reportNodeWarnings = useCallback((nodeUid: string, nodeIndex: number, nodeOp: string | undefined, warnings: string[]) => {
        const diags: IGraphDiagnostic[] | null = warnings.length === 0
            ? null
            : warnings.map((title) => ({ severity: 'warning', category: 'node', nodeUid, nodeIndex, nodeOp, title }));
        if (diagnosticsPausedRef.current) {
            pendingNodeWarningsRef.current.set(nodeUid, diags);
            return;
        }
        setNodeWarnings(prev => {
            const existing = prev[nodeUid];
            if (diags === null) {
                if (existing === undefined) { return prev; }
                const next = { ...prev };
                delete next[nodeUid];
                return next;
            }
            // bail out if unchanged so this doesn't retrigger a render loop every frame
            if (existing !== undefined && existing.length === diags.length && existing.every((d, i) => d.title === diags[i].title)) {
                return prev;
            }
            return { ...prev, [nodeUid]: diags };
        });
    }, []);

    const setDiagnosticsPaused = useCallback((paused: boolean) => {
        diagnosticsPausedRef.current = paused;
        setDiagnosticsPausedState(paused);
        if (!paused && pendingNodeWarningsRef.current.size > 0) {
            const pending = pendingNodeWarningsRef.current;
            pendingNodeWarningsRef.current = new Map();
            setNodeWarnings(prev => {
                const next = { ...prev };
                pending.forEach((diags, uid) => {
                    if (diags === null) { delete next[uid]; }
                    else { next[uid] = diags; }
                });
                return next;
            });
        }
    }, []);

    const allDiagnostics = useMemo(
        () => [...diagnostics, ...Object.values(nodeWarnings).flat()],
        [diagnostics, nodeWarnings]
    );

    const [gltfObjectModel, setGltfObjectModel] = useState<GltfObjectModel | null>(null);
    const [supportedPointerTemplates, setSupportedPointerTemplates] = useState<ReadonlySet<string> | null>(null);

    const getAuthorGraph = (graph: AuthoredGraph, options: GetAuthorGraphOptions = {}): [Node[], Edge[], IInteractivityEvent[], IInteractivityVariable[]] => {
        const { deferTypes = false } = options;
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const events: IInteractivityEvent[] = graph.events;
        const variables: IInteractivityVariable[] = graph.variables;

        // uid -> model node, built once so the per-edge source lookup below (and the layout BFS) is
        // O(1) instead of an O(n) graph.nodes.find per edge (was O(n*e) on load of a big graph)
        const nodeByUid = new Map<string, AuthoredNode>();
        graph.nodes.forEach((n) => { if (n.uid !== undefined) { nodeByUid.set(n.uid, n); } });

        // loop through all the nodes in our behave graph to extract nodes and edges
        graph.nodes.forEach((interactivityNode: AuthoredNode) => {
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
                // color the edge by the source output socket's data type - unless types are deferred
                // (chunked load), in which case skip the resolve and paint neutral gray for now
                let edgeColor = UNKNOWN_COLOR;
                if (!deferTypes) {
                  const sourceNode = nodeByUid.get(String(value.node));
                  edgeColor = getColorForTypeIndex(resolveOutputSocketType(sourceNode, value.socket!, graph.nodes));
                }
                edges.push({
                  id: uuidv4(),
                  source: String(value.node),
                  sourceHandle: value.socket,
                  target: String(interactivityNode.uid!),
                  targetHandle: key,
                  style: edgeStyle(edgeColor),
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
          // Precompute O(1) lookups reused across the layout below: reactflow node by id, outgoing
          // edges per source, and the set of nodes that are some edge's target (i.e. non-roots).
          // Replaces the per-iteration nodes.find / edges.filter / edges.some that made the BFS
          // O(n*e) on a big graph.
          const nodeById = new Map<string, Node>();
          nodes.forEach((node) => nodeById.set(node.id, node));
          const outEdgesBySource = new Map<string, string[]>();
          const targetIds = new Set<string>();
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
            (outEdgesBySource.get(source) ?? outEdgesBySource.set(source, []).get(source)!).push(target);
            targetIds.add(target);
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
              // Each layer is a vertical column of a disjoint graph. Since we start at the leftmost column where x = -500 (starting point).
              let lastLayer: string[] = disjointGraph.filter(nodeId => !targetIds.has(nodeId));
              let y = 0;
              for (let i = 0; i < lastLayer.length; i++) {
                const node = nodeById.get(lastLayer[i])!;
                node.position.x = -500;
                y = 500 * i + layerYAdditive;
                node.position.y = y;
                if (y > lastMaxY) {
                  lastMaxY = y;
                }
              }

              let nextLayer: string[] = [];
              for (const nodeId of lastLayer) {
                nextLayer.push(...(outEdgesBySource.get(nodeId) ?? []));
              }
              nextLayer = [...new Set(nextLayer)];

              let xOffset = 0;
              while (nextLayer.length > 0) {
                lastLayer = nextLayer;
                for (let i = 0; i < lastLayer.length; i++) {
                  const node = nodeById.get(lastLayer[i])!;
                  node.position.x = xOffset;
                  y = 500 * i + layerYAdditive;
                  node.position.y = y;
                  if (y > lastMaxY) {
                    lastMaxY = y;
                  }
                }

                nextLayer = [];
                for (const nodeId of lastLayer) {
                  nextLayer.push(...(outEdgesBySource.get(nodeId) ?? []));
                }
                nextLayer = [...new Set(nextLayer)];
                xOffset += 500;
              }
              layerYAdditive = 800 + lastMaxY;
          });
      
      
        }
      
        return [nodes, edges, events, variables];
      };

    // oldType is undefined when the file's numeric type index is out of bounds of its own `types`
    // array (a malformed/hand-edited file) - treat that the same as any other unsupported type
    // (-1) rather than throwing, since every call site already guards against -1.
    const getUpdatedTypeIndex = (oldType: {signature: string, extensions?: any} | undefined): number => {
      if (oldType == null) { return -1; }
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
    // Cancellation token for the in-flight chunked load. A second load flips the previous token's
    // `current` to true so runChunked bails at its next item boundary, then installs a fresh token —
    // this stops two loads from interleaving their batches onto the same graph.
    const loadCancelRef = useRef<{ current: boolean } | null>(null);

    const loadGraphFromJson = async (json: any) => {
        if (loadCancelRef.current) { loadCancelRef.current.current = true; }
        const cancelled = { current: false };
        loadCancelRef.current = cancelled;

        setDiagnosticsPaused(true);
        setLoadingState({ active: true, step: "Reading graph", progress: 0 });

        const newGraph: AuthoredGraph = {
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
        // collected now, committed together in the final "Checking" phase (below) so diagnostics
        // don't flicker in mid-load while nodes are still mounting
        const typeDiagnostics: IGraphDiagnostic[] = [...unsupportedTypes].map((label) => ({
            severity: 'warning',
            category: 'type',
            title: `Unsupported data type: ${label}`,
            detail: `This graph declares the data type "${label}", which this tool does not recognise. Values using it may not display or execute correctly.`,
        }));

        // translate the types to be the standard types
        for (const declaration of newGraph.declarations) {
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
        
        if (newGraph.variables) {
            for (const variable of newGraph.variables) {
                variable.type = getUpdatedTypeIndex(json.types[variable.type]);
            }
        }

        if (newGraph.events) {
          for (const event of newGraph.events) {
            for (const socket of Object.values(event.values)) {
              socket.type = getUpdatedTypeIndex(json.types[socket.type]);
            }
          }
        }


        const loadedNodes: AuthoredNode[] = [];
        const uuids: string[] = [];
        // track unsupported node operations (op -> number of nodes using it) so we can surface them
        const unsupportedOps = new Map<string, number>();
        // per-node spec-validity diagnostics (unknown socket names / socket type mismatches
        // against this op's declaration in nodes.ts) - not KHR_interactivity spec compliance of
        // the file overall, but of the individual node instances within it
        const nodeDiagnostics: IGraphDiagnostic[] = [];
        for (let i = 0; i < json.nodes.length; i++) {
            uuids.push(uuidv4());
        }
        try {
        // "Reading graph": instantiate each node from its spec template, frame-budgeted so a big
        // graph doesn't block the main thread in one pass. Progress drives the loading bar.
        await runChunked(json.nodes, (node: any, i: number) => {
            const declaration = json.declarations?.[node.declaration];
            if (declaration === undefined) {
                // malformed/hand-edited file: node.declaration doesn't index a real declaration -
                // skip just this node with a diagnostic instead of throwing and aborting the load
                nodeDiagnostics.push({
                    severity: 'error', category: 'node', nodeUid: uuids[i], nodeIndex: i, nodeOp: undefined,
                    title: 'Invalid declaration reference',
                    detail: `Node ${i} references declaration index ${node.declaration}, which does not exist in this file's declarations array. This node was skipped.`,
                });
                return;
            }
            const nodeOp = declaration.op;
            let isNoOp = false;
            let templateNode: AuthoredNode | undefined = interactivityNodeSpecs.find((schema: AuthoredNode) => schema.op === nodeOp);
            if (templateNode === undefined) {
                templateNode = createNoOpNode(declaration);
                isNoOp = true;
                unsupportedOps.set(nodeOp, (unsupportedOps.get(nodeOp) ?? 0) + 1);
            }
            
            const copyOfTemplateNode: AuthoredNode = structuredClone(templateNode);

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
        }, { cancelled, onProgress: (p) => setLoadingState({ active: true, step: "Reading graph", progress: p * 0.45 }) });

        newGraph.nodes = loadedNodes;

        // "Building nodes": Config-driven output sockets (pointer/get's `value`, variable/get's
        // `value`, ...) are spec defaulted to `bool` (type 0) and only get their real type from
        // `configuration` via the reconciler, which normally runs per-node when its AuthoringGraphNode
        // mounts - too late for the group-type propagation below, which would otherwise resolve a
        // downstream type-group (e.g. math/matMul's `a`/`b`/`value`) against that bool placeholder
        // instead of the pointer/variable's actual type. Resolve these first so
        // propagateGraphGroupTypes below sees the real types.
        setLoadingState({ active: true, step: "Building nodes", progress: 0.45 });
        await runChunked(loadedNodes, (loadedNode) => {
            if (loadedNode.configuration === undefined) { return; }
            const generated = computeConfigDrivenSockets(loadedNode.configuration, loadedNode.values?.input ?? {}, {
                nodeType: loadedNode.op,
                events: newGraph.events ?? {},
                variables: newGraph.variables ?? [],
            });
            for (const [key, value] of Object.entries(generated.outputValues)) {
                loadedNode.values = loadedNode.values ?? {};
                loadedNode.values.output = loadedNode.values.output ?? {};
                loadedNode.values.output[key] = value;
            }
        }, { cancelled, onProgress: (p) => setLoadingState({ active: true, step: "Building nodes", progress: 0.45 + p * 0.25 }) });

        // "Checking": commit the load-time diagnostics that don't depend on type propagation
        // (unsupported data types / node ops, per-node spec validity). These are safe to show as
        // soon as the model is built. The O(n²) type-group *propagation* — and the live per-node
        // warnings that depend on it — are deferred to the canvas rebuild (AuthoringComponent), which
        // runs the fixpoint after the graph is on-screen, recolors the (initially gray) value wires,
        // then unpauses live diagnostics and clears the loading bar. So diagnosticsPaused stays true
        // here; the graph-identity swap below hands those final phases to the component.
        setLoadingState({ active: true, step: "Checking", progress: 0.72 });
        // surface any node operations this tool does not implement (loaded as inert NoOp nodes)
        const opDiagnostics: IGraphDiagnostic[] = [...unsupportedOps.entries()].map(([op, count]) => ({
            severity: 'warning',
            category: 'operation',
            title: `Unsupported node operation: ${op}`,
            detail: `${count} node${count > 1 ? 's' : ''} in this graph use "${op}", which this tool does not implement. ${count > 1 ? 'They are' : 'It is'} shown as a NoOp node and will not execute.`,
        }));
        setDiagnosticsForCategory('type', typeDiagnostics);
        setDiagnosticsForCategory('operation', opDiagnostics);
        setDiagnosticsForCategory('node', nodeDiagnostics);

        // hand off to the canvas: replace the graph's identity — the single load signal the authoring
        // canvas watches to rebuild itself (see the rebuild effect in AuthoringComponent), which owns
        // the remaining "Arranging → Rendering → Connecting → Resolving types → Checking" phases and
        // clears the loading bar / unpauses diagnostics when done.
        setLoadingState({ active: true, step: "Arranging", progress: 0.75 });
        setGraph(newGraph);
        // a fresh load has nothing un-synced yet relative to itself
        clearGraphDirty();
        } catch (e) {
            // a superseding load cancelled this one - leave its state alone for the new load to own
            if (isAbortError(e)) { return; }
            throw e;
        }
    }


    const getExecutableGraph = () => {
        const executable: any = { declarations: [], nodes: [], variables: [], events: [], types: standardTypes};

        executable.events = [...graph.events || []];
        executable.variables = [...graph.variables || []];
        executable.declarations = [...graph.declarations || []];
        for (const node of graph.nodes) {

            // Create runtime-only values without editor help/type-resolution fields. A static
            // "unset" float value is
            // authored in-model as NaN (see socketReconciler.ts / AuthoringGraphNode.tsx); JSON has
            // no NaN/Infinity literal, and JSON.stringify silently turns them into `null` instead of
            // erroring, which would round-trip back in as a bogus 0 rather than the spec's actual
            // float default. Omit the socket instead so the runtime falls back to its own default.
            const strippedValues: Record<string, AuthoredValue> = {};
            Object.entries(node.values?.input || {}).forEach(([key, value]) => {
                if (Array.isArray(value.value) && value.value.some((v) => typeof v === "number" && !Number.isFinite(v))) {
                    return;
                }
                strippedValues[key] = toExecutableValue(value);
            });

            const strippedConfiguration = Object.fromEntries(
                Object.entries(node.configuration || {}).map(([key, value]) => [
                    key,
                    toExecutableConfigurationValue(value),
                ])
            );

            const behaveNode: any = {
                id: node.uid,
                declaration: getExecutableDeclarationIndex(node, executable.declarations),
                values: strippedValues,
                configuration: strippedConfiguration,
                flows: node.flows?.output || {},
                metadata: node.metadata
            };

            executable.nodes.push(JSON.parse(JSON.stringify(behaveNode)));
        }

        const hasCycle = !topologicalSort(executable.nodes);
        if (hasCycle !== cycleReportedRef.current) {
            cycleReportedRef.current = hasCycle;
            queueMicrotask(() => setDiagnosticsForCategory('graph', hasCycle ? [{
                severity: 'error',
                category: 'graph',
                title: 'Cycle detected in graph',
                detail: 'The graph contains a cycle, so a valid execution/export order cannot be resolved. The affected connections must be broken before the graph can run.',
            }] : []));
        }

        return executable;
    };

    const getExecutableDeclarationIndex = (node: AuthoredNode, declarations: IInteractivityDeclaration[]): number => {
        if (
            Number.isInteger(node.declaration)
            && node.declaration >= 0
            && declarations[node.declaration]?.op === node.op
        ) {
            return node.declaration;
        }

        return declarations.findIndex((declaration: IInteractivityDeclaration) => declaration.op === node.op);
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
            if (curNode === undefined) {break}
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
    
        // a cycle leaves some nodes unreachable. return a status instead of throwing so the JSON
        // view / export don't crash - callers surface a diagnostic and keep the un-sorted graph.
        const hasCycle = sortedList.length !== nodes.length;

        if (!hasCycle) {
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
        }

        // remove fake Links (always, so the returned nodes are clean whether or not we sorted)
        for (const node of nodes) {
            delete node.fakeLinks;
            delete node.id;
        }

        return !hasCycle;
    }

    // These mutators edit the current graph object in place (matching the old ref model) and do
    // not call setGraph, so they intentionally don't trigger a context re-render — the reactflow
    // canvas already reflects these edits through its own state. Only a load replaces graph identity.
    const addDeclaration = (declaration: IInteractivityDeclaration): number =>
        ensureInteractivityDeclaration(graph.declarations, declaration);

    const addEvent = (event: IInteractivityEvent) => {
        graph.events.push(event);
        markGraphDirty();
    };

    // Replace the whole custom-event list. Used by the Custom Events editor, which manages
    // add/edit/delete of events locally and commits the resulting array back in one call.
    const setEvents = (events: IInteractivityEvent[]) => {
        graph.events = events;
        markGraphDirty();
    };

    const addVariable = (variable: IInteractivityVariable) => {
        graph.variables.push(variable);
        markGraphDirty();
    };

    // Replace the whole variable list. Used by the Variables editor, which manages
    // add/edit/delete of variables locally and commits the resulting array back in one call.
    const setVariables = (variables: IInteractivityVariable[]) => {
        graph.variables = variables;
        markGraphDirty();
    };

    const addNode = (node: AuthoredNode) => {
        graph.nodes.push(node);
        markGraphDirty();
    };

    const removeNode = (uid: string) => {
        graph.nodes = graph.nodes.filter(node => node.uid !== uid);
        markGraphDirty();
    };

    const context: InteractivityGraphContextType = {
        graph: graph,
        diagnostics: diagnostics,
        setDiagnosticsForCategory: setDiagnosticsForCategory,
        clearDiagnostics: clearDiagnostics,
        allDiagnostics: allDiagnostics,
        reportNodeWarnings: reportNodeWarnings,
        loadingState: loadingState,
        setLoadingState: setLoadingState,
        diagnosticsPaused: diagnosticsPaused,
        setDiagnosticsPaused: setDiagnosticsPaused,
        gltfObjectModel: gltfObjectModel,
        setGltfObjectModel: setGltfObjectModel,
        supportedPointerTemplates: supportedPointerTemplates,
        setSupportedPointerTemplates: setSupportedPointerTemplates,
        getAuthorGraph: getAuthorGraph,
        loadGraphFromJson: loadGraphFromJson,
        getExecutableGraph: getExecutableGraph,
        addDeclaration: addDeclaration,
        addEvent: addEvent,
        setEvents: setEvents,
        addVariable: addVariable,
        setVariables: setVariables,
        addNode: addNode,
        removeNode: removeNode,
        graphDirty: graphDirty,
        markGraphDirty: markGraphDirty,
        clearGraphDirty: clearGraphDirty,
        registerPlayHandler: registerPlayHandler,
        requestPlay: requestPlay
    };

    return <InteractivityGraphContext.Provider value={context}>{children}</InteractivityGraphContext.Provider>;
};
