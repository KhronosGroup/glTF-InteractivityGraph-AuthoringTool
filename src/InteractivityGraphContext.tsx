import { createContext, useRef } from 'react';
import { IInteractivityDecleration, IInteractivityEvent, IInteractivityGraph, IInteractivityNode, IInteractivityVariable } from './types/InteractivityGraph';
import { standardTypes } from './types/nodes';

interface InteractivityGraphContextType {
    graph: IInteractivityGraph,
    getExecutableGraph: () => any,
    addDecleration: (decleration: IInteractivityDecleration) => void,
    getDeclerationIndex: (op: string) => number,
    addEvent: (event: IInteractivityEvent) => void,
    addVariable: (variable: IInteractivityVariable) => void,
    addNode: (node: IInteractivityNode) => void,
    updateNode: (updatedNode: IInteractivityNode, uid: string) => void,
    removeNode: (uid: string) => void
}

const initialGraph: IInteractivityGraph = {
    declerations: [],
    nodes: [],
    events: [],
    variables: [],
    types: standardTypes
};

const initialContext: InteractivityGraphContextType = {
    graph: initialGraph,
    getExecutableGraph: () => {return null},
    addDecleration: () => {return null},
    getDeclerationIndex: () => -1,
    addEvent: () => {return null},
    addVariable: () => {return null},
    addNode: () => {return null},
    updateNode: () => {return null},
    removeNode: () => {return null}
};

export const InteractivityGraphContext = createContext<InteractivityGraphContextType>(initialContext);

export const InteractivityGraphProvider = ({ children }: { children: React.ReactNode }) => {
    const usedNodeDeclerationRef = useRef<Set<string>>(new Set());
    const graphRef = useRef<IInteractivityGraph>(initialGraph);


    const getExecutableGraph = () => {
        const graph: any = { nodes: [], variables: [], events: [], types: standardTypes};

        graph.events = [...graphRef.current.events];
        graph.variables = [...graphRef.current.variables];

        for (const node of graphRef.current.nodes) {

            //TODO: add metadta for position
            const behaveNode: any = {
                id: node.uid,
                type: node.op,
                values: node.values?.input || {},
                configuration: node.configuration || {},
                flows: node.flows?.output || {},
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

        console.log(nodeIdToInDegree);
    
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
            // delete node.id;
        }

        console.log(nodes);
    }

    const addDecleration = (decleration: IInteractivityDecleration) => {
        if (usedNodeDeclerationRef.current.has(decleration.op)) {
            return;
        }
        graphRef.current.declerations.push(decleration);
        usedNodeDeclerationRef.current.add(decleration.op);
    };

    const getDeclerationIndex = (op: string): number => {
        return graphRef.current.declerations.findIndex(decleration => decleration.op === op);
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

    const updateNode = (updatedNode: IInteractivityNode, uid: string) => {
        graphRef.current.nodes = graphRef.current.nodes.map(node => node.uid === uid ? updatedNode : node);
    };

    const removeNode = (uid: string) => {
        graphRef.current.nodes = graphRef.current.nodes.filter(node => node.uid !== uid);
    };

    const context: InteractivityGraphContextType = {
        graph: graphRef.current,
        getExecutableGraph: getExecutableGraph,
        addDecleration: addDecleration,
        getDeclerationIndex: getDeclerationIndex,
        addEvent: addEvent,
        addVariable: addVariable,
        addNode: addNode,
        updateNode: updateNode,
        removeNode: removeNode
    };

    return <InteractivityGraphContext.Provider value={context}>{children}</InteractivityGraphContext.Provider>;
};
