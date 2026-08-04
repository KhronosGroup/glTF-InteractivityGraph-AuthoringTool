import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IInteractivityDeclaration, IInteractivityEvent, IInteractivityGraph, IInteractivityVariable } from './BasicBehaveEngine/types/InteractivityGraph';
import { AuthoredGraph, AuthoredNode, AuthoredValue, NodeSpecFlag } from './authoring/spec/AuthoredGraph';
import { buildNodeByUid, createNoOpNode, getNodeSpec, hasNodeSpecFlag, resolveOutputSocketType, standardTypes } from './authoring/spec/nodes';
import { reconcileNodeSockets } from './authoring/socketReconciler';
import { buildNodeByUidMap, computeNodeLiveWarnings } from './authoring/validation';
import { v4 as uuidv4 } from 'uuid';
import { Edge, Node } from 'reactflow';
import { DiagnosticCategory, IGraphDiagnostic } from './diagnostics';
import { FLOW_COLOR, UNKNOWN_COLOR, getColorForTypeIndex } from './authoring/socketColors';
import { GltfObjectModel } from './authoring/gltfObjectModel';
import { runChunked, isAbortError } from './utils/frameBudget';
import { ensureInteractivityDeclaration } from './authoring/declarations';
import { getExecutableDeclarationIndex, toExecutableConfigurationValue, toExecutableValue } from './authoring/executableGraph';

const edgeStyle = (color: string) => ({ stroke: color, strokeWidth: 2 });

// Auto-layout spacing (used when a loaded graph carries no node positions): the grid pitch between
// nodes, and the gap left between two disjoint components once they are packed.
const NODE_SPACING = 500;
const COMPONENT_GAP = 800;

// How long an edit burst is collected before the live validation pass runs (see markGraphDirty).
// Short enough that a warning appears effectively while typing, long enough that holding a key
// down or dragging a slider doesn't queue one whole-graph pass per keystroke.
const LIVE_VALIDATION_DEBOUNCE_MS = 250;

// equality for the nodeWarnings state, so a validation pass that changes nothing keeps the
// previous object identity and doesn't re-render every provider consumer
const nodeWarningsEqual = (a: Record<string, IGraphDiagnostic[]>, b: Record<string, IGraphDiagnostic[]>): boolean => {
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) { return false; }
    for (const key of aKeys) {
        const aDiags = a[key];
        const bDiags = b[key];
        if (bDiags === undefined || aDiags.length !== bDiags.length) { return false; }
        for (let i = 0; i < aDiags.length; i++) {
            if (aDiags[i].title !== bDiags[i].title
                || aDiags[i].socket !== bDiags[i].socket
                || aDiags[i].nodeIndex !== bDiags[i].nodeIndex) { return false; }
        }
    }
    return true;
};

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
    // uid -> node index over graph.nodes, kept in sync by addNode/removeNode. Every mounted node
    // resolves its own model entry through this; a .find per node was O(n²) across a big canvas.
    nodeByUid: ReadonlyMap<string, AuthoredNode>,
    diagnostics: IGraphDiagnostic[],
    setDiagnosticsForCategory: (category: DiagnosticCategory, diagnostics: IGraphDiagnostic[]) => void,
    clearDiagnostics: () => void,
    // diagnostics + the per-node warnings of the last *applied* graph — the state the runtime is
    // actually running (load, or the most recent Reload/Play). Drives the "Loaded with issues"
    // panel, which therefore doesn't churn while the user is still editing.
    appliedDiagnostics: IGraphDiagnostic[],
    // diagnostics + the per-node warnings of the graph as it stands right now, recomputed on every
    // edit. Drives the graph editor's in-canvas counter, which must always show current issues.
    liveDiagnostics: IGraphDiagnostic[],
    // load-time 'node'-category diagnostics indexed by node uid. Each mounted node needs only its
    // own; filtering the whole list per node per render was O(nodes x diagnostics) on a big graph.
    diagnosticsByNodeUid: ReadonlyMap<string, IGraphDiagnostic[]>,
    // Live per-node socket warnings keyed by node uid, computed whole-graph from the model by
    // runLiveValidation (computeNodeLiveWarnings in validation.ts) — never from what happens to be
    // mounted on the canvas, so viewport culling/LOD/mount order cannot change the counts. Nodes
    // read their own entry for the ⚠/red-border display. Only warned nodes have an entry.
    nodeWarnings: Record<string, IGraphDiagnostic[]>,
    // Recompute nodeWarnings for the whole graph now (chunked across frames, superseding any
    // in-flight run). Resolves true once committed, false when superseded by a newer run/load.
    // The canvas rebuild awaits this in its final "Checking" phase, with markApplied so the result
    // also becomes the applied snapshot behind appliedDiagnostics; interactive edits instead go
    // through the debounced trigger wired into markGraphDirty, which updates only the live set.
    runLiveValidation: (options?: { markApplied?: boolean }) => Promise<boolean>,
    // Progress of the current chunked load, published through an external store rather than React
    // state: it ticks once per frame-budget yield, and as part of the context value each tick
    // re-rendered every consumer — the canvas and all its mounted nodes included. Only the
    // LoadingProgressBar subscribes (via useSyncExternalStore), so ticks are now free for everyone
    // else. Both accessors are stable, so they never invalidate the context value.
    setLoadingState: (state: LoadingState | null) => void,
    subscribeLoadingState: (listener: () => void) => () => void,
    getLoadingState: () => LoadingState | null,
    gltfObjectModel: GltfObjectModel | null,
    setGltfObjectModel: (model: GltfObjectModel | null) => void,
    supportedPointerTemplates: ReadonlySet<string> | null,
    setSupportedPointerTemplates: (templates: ReadonlySet<string> | null) => void,
    getAuthorGraph: (graph: AuthoredGraph, options?: GetAuthorGraphOptions) => [Node[], Edge[], IInteractivityEvent[], IInteractivityVariable[]],
    // The single sanctioned Authoring -> Engine coupling point: projects the editor's AuthoredGraph
    // down to a runtime IInteractivityGraph (topologically sorted) for BasicBehaveEngine. Data flows
    // one way; the engine never reads the AuthoredGraph.
    getExecutableGraph: () => IInteractivityGraph,
    loadGraphFromJson: (json: any) => Promise<void>,
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
    nodeByUid: new Map(),
    diagnostics: [],
    setDiagnosticsForCategory: () => {return null},
    clearDiagnostics: () => {return null},
    appliedDiagnostics: [],
    liveDiagnostics: [],
    diagnosticsByNodeUid: new Map(),
    nodeWarnings: {},
    runLiveValidation: async () => false,
    setLoadingState: () => {return null},
    subscribeLoadingState: () => () => {return undefined},
    getLoadingState: () => null,
    gltfObjectModel: null,
    setGltfObjectModel: () => {return null},
    supportedPointerTemplates: null,
    setSupportedPointerTemplates: () => {return null},
    getAuthorGraph: (graph: AuthoredGraph, options?: GetAuthorGraphOptions) => {return [[], [], [], []]},
    getExecutableGraph: () => ({ declarations: [], nodes: [], types: [], events: [], variables: [] }),
    loadGraphFromJson: async () => {return undefined},
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

    // See graphDirty on the context type. Every genuine user edit funnels through markGraphDirty
    // (the node setters, connect/disconnect, add/remove node), so that is also where live warnings
    // are kept current: authoring issues have to show up as the user edits, not only once the
    // changes are applied via Reload/Play (clearGraphDirty). The pass is debounced to coalesce
    // bursts, and runLiveValidation supersedes any still-in-flight run through its own cancel
    // token, so only the newest result is ever committed.
    const [graphDirty, setGraphDirty] = useState(false);
    const validationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleLiveValidation = useCallback(() => {
        if (validationDebounceRef.current !== null) { clearTimeout(validationDebounceRef.current); }
        validationDebounceRef.current = setTimeout(() => {
            validationDebounceRef.current = null;
            void runLiveValidation();
        }, LIVE_VALIDATION_DEBOUNCE_MS);
    }, []);
    const cancelScheduledLiveValidation = useCallback(() => {
        if (validationDebounceRef.current === null) { return; }
        clearTimeout(validationDebounceRef.current);
        validationDebounceRef.current = null;
    }, []);
    useEffect(() => cancelScheduledLiveValidation, [cancelScheduledLiveValidation]);
    const markGraphDirty = useCallback(() => {
        setGraphDirty(true);
        scheduleLiveValidation();
    }, [scheduleLiveValidation]);
    const clearGraphDirty = useCallback(() => {
        setGraphDirty(false);
        // Reload/Play applies the edited graph, so this pass advances the applied snapshot too. It
        // runs now, so drop the pending debounced one rather than repeating it.
        cancelScheduledLiveValidation();
        void runLiveValidation({ markApplied: true });
    }, [cancelScheduledLiveValidation]);

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
    // node uid — the whole-graph, model-driven output of runLiveValidation below. Only nodes with
    // warnings have an entry. Never written from component renders: computing this from mounted
    // nodes made the counts depend on the viewport (culling unmounted a node -> warnings vanished).
    const [nodeWarnings, setNodeWarnings] = useState<Record<string, IGraphDiagnostic[]>>({});

    // Same shape, but frozen at the last *applied* graph (load, or Reload/Play) rather than
    // following every edit — i.e. the issues of what the runtime is currently running. Only a
    // markApplied validation run advances it, so the "Loaded with issues" panel keeps describing
    // the applied graph while the editor's own surfaces move ahead with the user's edits.
    const [appliedNodeWarnings, setAppliedNodeWarnings] = useState<Record<string, IGraphDiagnostic[]>>({});

    // uids deleted in the editor since the last apply. Their load-time diagnostics are filtered out
    // of the live set right away (the node is gone from the editor) but stay in the applied set
    // until the deletion is actually applied, at which point the applied run flushes them for good
    // — being load-time, they are never re-derived, so nothing else would drop them. State rather
    // than a plain ref because the live set is derived from it; the ref mirrors it for the
    // validation callback, which is stable and can't close over the current value.
    const [pendingRemovedUids, setPendingRemovedUids] = useState<ReadonlySet<string>>(new Set());
    const pendingRemovedUidsRef = useRef(pendingRemovedUids);
    pendingRemovedUidsRef.current = pendingRemovedUids;

    // See setLoadingState on the context type: the current phase/progress lives here, outside React
    // state, and is pushed to subscribers.
    const loadingStateRef = useRef<LoadingState | null>(null);
    const loadingListenersRef = useRef(new Set<() => void>());
    const setLoadingState = useCallback((state: LoadingState | null) => {
        loadingStateRef.current = state;
        loadingListenersRef.current.forEach((listener) => listener());
    }, []);
    const subscribeLoadingState = useCallback((listener: () => void) => {
        loadingListenersRef.current.add(listener);
        return () => { loadingListenersRef.current.delete(listener); };
    }, []);
    const getLoadingState = useCallback(() => loadingStateRef.current, []);

    // identity mirror of `graph` so the stable validation callbacks always validate the current
    // model (interactive edits mutate the object in place; only a load swaps identity)
    const graphRef = useRef<AuthoredGraph>(graph);
    graphRef.current = graph;

    // Whole-graph live validation. Chunked with the same frame budget as the loader so a large
    // graph never blocks the main thread; a newer run (or a new load) supersedes an in-flight one
    // via the cancel token, in which case nothing is committed.
    const validationCancelRef = useRef<{ current: boolean } | null>(null);

    // resolves true once the result is committed, false when superseded by a newer run/load (the
    // newer owner then controls nodeWarnings and the loading bar)
    const runLiveValidation = useCallback(async ({ markApplied = false }: { markApplied?: boolean } = {}): Promise<boolean> => {
        // this pass covers everything a pending debounced one would have
        cancelScheduledLiveValidation();
        if (validationCancelRef.current) { validationCancelRef.current.current = true; }
        const cancelled = { current: false };
        validationCancelRef.current = cancelled;

        const graphNodes = graphRef.current.nodes;
        const variables = graphRef.current.variables ?? [];
        const byUid = buildNodeByUidMap(graphNodes);
        const nodeIndexByUid = new Map<string, number>();
        graphNodes.forEach((graphNode, index) => { if (graphNode.uid !== undefined) { nodeIndexByUid.set(graphNode.uid, index); } });

        const next: Record<string, IGraphDiagnostic[]> = {};
        try {
            await runChunked(graphNodes, (graphNode) => {
                if (graphNode.uid === undefined) { return; }
                const warnings = computeNodeLiveWarnings(graphNode, graphNodes, variables, byUid);
                if (warnings.length === 0) { return; }
                next[graphNode.uid] = warnings.map((w) => ({
                    severity: 'warning', category: 'node',
                    nodeUid: graphNode.uid, nodeIndex: nodeIndexByUid.get(graphNode.uid!), nodeOp: graphNode.op,
                    title: w.message, socket: w.socket,
                }));
            }, { cancelled });
        } catch (e) {
            if (isAbortError(e)) { return false; }
            throw e;
        }
        if (cancelled.current) { return false; }
        // one replace-all commit: also implicitly drops entries of deleted nodes. Keep the previous
        // identity when nothing changed so provider consumers don't re-render for a clean pass.
        setNodeWarnings(prev => (nodeWarningsEqual(prev, next) ? prev : next));
        // the graph was just loaded/applied, so this result is also the applied snapshot — and the
        // deletions it reflects can now be flushed from the load-time diagnostics
        if (markApplied) {
            setAppliedNodeWarnings(prev => (nodeWarningsEqual(prev, next) ? prev : next));
            const removed = pendingRemovedUidsRef.current;
            if (removed.size > 0) {
                pendingRemovedUidsRef.current = new Set<string>();
                setPendingRemovedUids(pendingRemovedUidsRef.current);
                setDiagnostics(prev => prev.filter(d => d.nodeUid === undefined || !removed.has(d.nodeUid)));
            }
        }
        return true;
    }, []);

    const appliedDiagnostics = useMemo(
        () => [...diagnostics, ...Object.values(appliedNodeWarnings).flat()],
        [diagnostics, appliedNodeWarnings]
    );

    const liveDiagnostics = useMemo(
        // load-time entries for nodes the user has already deleted are not "current" even though
        // the applied set still carries them (see pendingRemovedUids)
        () => [
            ...(pendingRemovedUids.size === 0
                ? diagnostics
                : diagnostics.filter(d => d.nodeUid === undefined || !pendingRemovedUids.has(d.nodeUid))),
            ...Object.values(nodeWarnings).flat(),
        ],
        [diagnostics, nodeWarnings, pendingRemovedUids]
    );

    const diagnosticsByNodeUid = useMemo(() => {
        const byUid = new Map<string, IGraphDiagnostic[]>();
        for (const diagnostic of diagnostics) {
            if (diagnostic.category !== 'node' || diagnostic.nodeUid === undefined) { continue; }
            const existing = byUid.get(diagnostic.nodeUid);
            if (existing === undefined) { byUid.set(diagnostic.nodeUid, [diagnostic]); } else { existing.push(diagnostic); }
        }
        return byUid;
    }, [diagnostics]);

    // rebuilt only when a load swaps the graph's identity; interactive add/remove keep it current
    // in place (they mutate graph.nodes without a setGraph, so the memo never re-runs for them)
    const nodeByUid = useMemo(() => buildNodeByUid(graph.nodes), [graph]);

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
            // Deliberately no width/height here. Reactflow treats a node it has not measured yet as
            // visible, which is what makes every node of a freshly loaded graph mount once even
            // with viewport culling on — and that first mount is the only thing that registers the
            // node's handles. Pre-seeding an estimated box lets culling skip nodes before they ever
            // mount, and an edge whose endpoint has no registered handleBounds is silently dropped,
            // so large graphs came up missing their connections. The cost of that full first mount
            // is handled by mounting at a zoomed-out (LOD) viewport instead — see AuthoringComponent.
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
                  edgeColor = getColorForTypeIndex(resolveOutputSocketType(sourceNode, value.socket!, graph.nodes, nodeByUid));
                }
                edges.push({
                  id: uuidv4(),
                  source: String(value.node),
                  sourceHandle: value.socket,
                  target: String(interactivityNode.uid!),
                  targetHandle: key,
                  style: edgeStyle(edgeColor),
                });
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
          // one buffer for every component, walked with a head index — Array.shift() on a queue
          // holding thousands of nodes is O(n) per dequeue, i.e. O(n²) for the whole traversal
          const queue: string[] = [];

          // Traverse graph and assign disjointGraphs
          nodes.forEach((node) => {
            const { id } = node;
            if (!visited[id]) {
              visited[id] = true;
              const disjointGraph: string[] = [];
              queue.length = 0;
              queue.push(id);
              let head = 0;

              while (head < queue.length) {
                const currentNode = queue[head++];
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
      
            // Each disjoint component is laid out on its own at the origin, then the components are
            // packed into a roughly square canvas below. They used to be stacked in one vertical
            // column, which on a graph with hundreds of components (Overview has 243, mathtests 398)
            // produced a canvas over a million units tall but only ~150k wide — an aspect ratio no
            // viewport can usefully frame, so "fit the graph" showed under 1% of it and exploring
            // meant scrolling down a near-empty corridor.
            const componentBoxes: { nodeIds: string[], minX: number, minY: number, width: number, height: number }[] = [];

            disjointGraphs.forEach((disjointGraph) => {
              // Each layer is a vertical column of a disjoint graph. Since we start at the leftmost column where x = -500 (starting point).
              let lastLayer: string[] = disjointGraph.filter(nodeId => !targetIds.has(nodeId));
              for (let i = 0; i < lastLayer.length; i++) {
                const node = nodeById.get(lastLayer[i])!;
                node.position.x = -500;
                node.position.y = 500 * i;
              }

              let nextLayer: string[] = [];
              for (const nodeId of lastLayer) {
                nextLayer.push(...(outEdgesBySource.get(nodeId) ?? []));
              }
              nextLayer = [...new Set(nextLayer)];

              let xOffset = 0;
              // the walk has no visited set (a node reachable at several depths is deliberately
              // re-placed at the deepest one), so bound it by the component size: a graph with a
              // cycle would otherwise spin here forever instead of just laying out oddly
              let layerBudget = disjointGraph.length;
              while (nextLayer.length > 0 && layerBudget-- > 0) {
                lastLayer = nextLayer;
                for (let i = 0; i < lastLayer.length; i++) {
                  const node = nodeById.get(lastLayer[i])!;
                  node.position.x = xOffset;
                  node.position.y = 500 * i;
                }

                nextLayer = [];
                for (const nodeId of lastLayer) {
                  nextLayer.push(...(outEdgesBySource.get(nodeId) ?? []));
                }
                nextLayer = [...new Set(nextLayer)];
                xOffset += 500;
              }

              // this component's own bounds, so the packing below can place it as one block
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              for (const nodeId of disjointGraph) {
                const { x, y } = nodeById.get(nodeId)!.position;
                minX = Math.min(minX, x); minY = Math.min(minY, y);
                maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
              }
              componentBoxes.push({
                nodeIds: disjointGraph,
                minX, minY,
                width: maxX - minX + NODE_SPACING,
                height: maxY - minY + NODE_SPACING,
              });
          });

          // Shelf-pack the components into rows, wrapping at a width derived from their total area
          // so the finished canvas comes out roughly square and can actually be framed.
          const totalArea = componentBoxes.reduce((sum, box) => sum + box.width * box.height, 0);
          const rowWidthLimit = Math.sqrt(totalArea) * 1.3;
          let cursorX = 0;
          let cursorY = 0;
          let rowHeight = 0;
          for (const box of componentBoxes) {
            if (cursorX > 0 && cursorX + box.width > rowWidthLimit) {
              cursorX = 0;
              cursorY += rowHeight + COMPONENT_GAP;
              rowHeight = 0;
            }
            const offsetX = cursorX - box.minX;
            const offsetY = cursorY - box.minY;
            for (const nodeId of box.nodeIds) {
              const position = nodeById.get(nodeId)!.position;
              position.x += offsetX;
              position.y += offsetY;
            }
            cursorX += box.width + COMPONENT_GAP;
            rowHeight = Math.max(rowHeight, box.height);
          }
        }
      
        return [nodes, edges, events, variables];
      };

    // oldType is undefined when the file's numeric type index is out of bounds of its own `types`
    // array (a malformed/hand-edited file) - treat that the same as any other unsupported type
    // (-1) rather than throwing, since every call site already guards against -1.
    const getUpdatedTypeIndex = (oldType: {signature: string, extensions?: any} | string | undefined): number => {
      if (oldType == null) { return -1; }
      // a `types` entry is spec'd as {signature}, but graphs written by other tools abbreviate it to
      // the bare signature string or only carry the display `name` - all three name the same type,
      // so accept them rather than mapping the whole graph to -1 (every socket "unsupported")
      if (typeof oldType === "string") {
        return standardTypes.findIndex(type => type.signature === oldType);
      }
      const oldTypeSignature = oldType.signature ?? (oldType as {name?: string}).name;
      if (oldTypeSignature === "custom") {
        const typeExtensions = JSON.stringify(Object.keys(oldType.extensions || {}).sort())
        return standardTypes.findIndex(type => type.signature === "custom" && JSON.stringify(Object.keys(type.extensions).sort()) == typeExtensions)
      } else {
        return standardTypes.findIndex(type => type.signature === oldTypeSignature);
      }
    }

    // human-readable label for a graph type entry (custom types are identified by their extension key)
    const getTypeLabel = (type: {signature: string, name?: string, extensions?: any} | string): string => {
      if (typeof type === "string") { return type; }
      if (type.signature === "custom") {
        const extensionKeys = Object.keys(type.extensions || {});
        return extensionKeys.length > 0 ? extensionKeys.join(", ") : "custom";
      }
      return type.signature ?? type.name ?? "unknown";
    }
    // Cancellation token for the in-flight chunked load. A second load flips the previous token's
    // `current` to true so runChunked bails at its next item boundary, then installs a fresh token —
    // this stops two loads from interleaving their batches onto the same graph.
    const loadCancelRef = useRef<{ current: boolean } | null>(null);

    const loadGraphFromJson = async (json: any) => {
        if (loadCancelRef.current) { loadCancelRef.current.current = true; }
        const cancelled = { current: false };
        loadCancelRef.current = cancelled;

        // supersede any in-flight live validation — it would be validating the outgoing graph —
        // and drop its stale warnings; the canvas rebuild's "Checking" phase runs a fresh
        // authoritative pass once the new graph is fully typed
        if (validationCancelRef.current) { validationCancelRef.current.current = true; }
        setNodeWarnings({});
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
            let templateNode: AuthoredNode | undefined = getNodeSpec(nodeOp);
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

        // "Building nodes": run the full per-node socket reconciliation (config-driven sockets +
        // spec/existing merge — the same reconcileNodeSockets pass AuthoringGraphNode runs on
        // mount/config change) so the model is FULLY materialised before anything renders or
        // resolves types. This matters twice over:
        // - config-driven sockets (pointer/get's `value` type, math/switch's case inputs,
        //   variable/set's inputs, event/send's params, ...) must exist with their real types
        //   before the deferred propagateGraphGroupTypes fixpoint runs in the canvas rebuild,
        //   or a type-group would resolve against a placeholder / a missing member;
        // - a node's mount reconcile becomes a true no-op, so with viewport culling
        //   (onlyRenderVisibleElements) it no longer matters whether a node mounts before or
        //   after that one propagation pass — type resolution is mount-order-independent.
        setLoadingState({ active: true, step: "Building nodes", progress: 0.45 });
        await runChunked(loadedNodes, (loadedNode) => {
            const isNoOp = getNodeSpec(loadedNode.op) === undefined;
            const reconciled = reconcileNodeSockets({
                op: loadedNode.op,
                isNoOp,
                configuration: loadedNode.configuration ?? {},
                inputValues: loadedNode.values?.input ?? {},
                outputValues: loadedNode.values?.output ?? {},
                inputFlows: loadedNode.flows?.input ?? {},
                outputFlows: loadedNode.flows?.output ?? {},
                events: newGraph.events ?? {},
                variables: newGraph.variables ?? [],
            });
            // mirror the component's model setters exactly (they always materialise all four
            // records), so load-time state is byte-equivalent to post-mount state
            loadedNode.values = loadedNode.values ?? {};
            loadedNode.values.input = reconciled.inputValues;
            loadedNode.values.output = reconciled.outputValues;
            loadedNode.flows = loadedNode.flows ?? {};
            loadedNode.flows.input = reconciled.inputFlows;
            loadedNode.flows.output = reconciled.outputFlows;
        }, { cancelled, onProgress: (p) => setLoadingState({ active: true, step: "Building nodes", progress: 0.45 + p * 0.25 }) });

        // "Checking": commit the load-time diagnostics that don't depend on type propagation
        // (unsupported data types / node ops, per-node spec validity). These are safe to show as
        // soon as the model is built. The O(n²) type-group *propagation* — and the whole-graph live
        // validation that depends on it — are deferred to the canvas rebuild (AuthoringComponent),
        // which runs the fixpoint after the graph is on-screen, recolors the (initially gray) value
        // wires, awaits runLiveValidation and clears the loading bar. The graph-identity swap below
        // hands those final phases to the component.
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
        // runs the whole-graph live validation / clears the loading bar when done.
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

    const topologicalSort = (nodes: any[]) => {
        const sortedList = [];
    
        // create degree map. nodeById indexes the same list so the two lookups below aren't linear
        // scans — they run once per value link and once per dequeued edge, i.e. O(n²) without it.
        const nodeIdToInDegree = new Map();
        const nodeById = new Map<any, any>();
        for (const node of nodes) {
            nodeIdToInDegree.set(node.id, 0);
            nodeById.set(node.id, node);
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
                    const referencedNode = nodeById.get(valueBackRefNodeId);
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
                    const nodeToPush: Node = nodeById.get(outId)!;
                    queue.push(nodeToPush);
                }
            }
        }
    
        // a cycle leaves some nodes unreachable. return a status instead of throwing so the JSON
        // view / export don't crash - callers surface a diagnostic and keep the graph in its
        // original (non-execution) order.
        const hasCycle = sortedList.length !== nodes.length;

        // Rewrite every uid to its exported array index. A cycle only means we can't put the nodes in
        // execution order - the ids still have to become indices, since that is the only node
        // reference an interactivity graph has (there is no `id` field to fall back on: it's deleted
        // below). Leaving uuids in here made a cyclic graph's JSON unloadable: every flow/value link
        // resolved to `uuids[<uuid string>]` === undefined on re-import, silently dropping all wires
        // and snapping the orphaned sockets back to their spec placeholder types.
        const order = hasCycle ? nodes : sortedList;
        const oldIdToTopologicalId = new Map();
        for (let i = 0; i < order.length; i++) {
            oldIdToTopologicalId.set(order[i].id, i);
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
        if (node.uid !== undefined) { nodeByUid.set(node.uid, node); }
        markGraphDirty();
    };

    const removeNode = (uid: string) => {
        graph.nodes = graph.nodes.filter(node => node.uid !== uid);
        nodeByUid.delete(uid);
        // Load-time 'node' diagnostics (e.g. "Invalid declaration reference") are keyed by nodeUid
        // and never re-derived from the current graph, so a deleted node's entry has to be dropped
        // explicitly or it lingers in the panel forever — but not here.
        // Don't drop this node's load-time diagnostics yet: the panel reports the *applied* graph,
        // and deleting a node in the editor doesn't change what the runtime is running until the
        // user applies. Queue the uid instead — the next applied run prunes it (see
        // pendingRemovedUidsRef). appliedNodeWarnings needs no queueing: that same run recomputes
        // it wholesale from the by-then node-less graph.
        // mirror updated eagerly too, so two deletes in one tick can't lose the first
        pendingRemovedUidsRef.current = new Set(pendingRemovedUidsRef.current).add(uid);
        setPendingRemovedUids(pendingRemovedUidsRef.current);
        markGraphDirty();
    };

    const context: InteractivityGraphContextType = {
        graph: graph,
        nodeByUid: nodeByUid,
        diagnostics: diagnostics,
        setDiagnosticsForCategory: setDiagnosticsForCategory,
        clearDiagnostics: clearDiagnostics,
        appliedDiagnostics: appliedDiagnostics,
        liveDiagnostics: liveDiagnostics,
        diagnosticsByNodeUid: diagnosticsByNodeUid,
        nodeWarnings: nodeWarnings,
        runLiveValidation: runLiveValidation,
        setLoadingState: setLoadingState,
        subscribeLoadingState: subscribeLoadingState,
        getLoadingState: getLoadingState,
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
