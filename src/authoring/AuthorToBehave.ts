import { Edge, Node } from "reactflow";
import {
    IAuthoringNode,
    ICustomEvent,
    IFlowSocketDescriptor,
    authoringNodeSpecs,
    standardTypes
} from "./AuthoringNodeSpecs";
import {IVariable} from "./AuthoringNodeSpecs";

/**
 * Converts authoring data to Behave graph format.
 *
 * @param nodes - An array of ReactFlow Node objects.
 * @param edges - An array of ReactFlow Edge objects.
 * @param customEvents - An array of custom event objects.
 * @param variables - An array of variable objects.
 * @returns The Behave graph representation of the provided data.
 */
export const authorToBehave = (nodes: Node[], edges: Edge[], customEvents: ICustomEvent[], variables: IVariable[]) => {
    const graph: any = { nodes: [], variables: [], customEvents: [], types: standardTypes};

    graph.customEvents = [...customEvents];
    graph.variables = [...variables];

    // loop through all the nodes and embed the edge data in them to correspond to the behave graph spec
    nodes.forEach((node) => {
        if (node.type === undefined) return;

        //create behave node
        const behaveNode: any = {
            id: node.id,
            type: node.type,
            values: [],
            configuration: [],
            flows: [],
            metadata: {
                positionX: String(node.position.x),
                positionY: String(node.position.y),
            }, // Metadata is left in for ease of placing nodes when re-imported to authoring, but is not part of the spec
        };

        // embed configuration
        if (node.data.configuration !== undefined) {
            Object.entries(node.data.configuration).forEach(([key, value]) => {
                behaveNode.configuration.push({id: key, value: value as string})
            });
        }

        const nodeSpec = authoringNodeSpecs.find((nodeSpec: IAuthoringNode) => nodeSpec.type === node.type)!

        // for all the inlined values (i.e. does not reference the outValue of another node) embed the value into the graph
        if (node.data.values !== undefined) {
            Object.entries(node.data.values).forEach(([key, val]) => {
                let typeIndex;
                if (node.type === "customEvent/send") {
                    typeIndex = customEvents[node.data.configuration.customEvent].values!.find(val => key.includes(val.id))!.type
                } else if (node.type === "variable/set") {
                    typeIndex = variables[node.data.configuration.variable].type
                } else {
                    //TODO: refactor this logic it is gross
                    const nodeSpecParam = nodeSpec.input.values.find(val => key.includes(val.id));
                    if (nodeSpecParam === undefined) {
                        // configuration based vals which are from paths so can only be ints
                        typeIndex = node.data.types.findIndex((typeItem: any) => typeItem.signature === 'int');
                    } else {
                        const allowedTypes = nodeSpecParam!.types
                        if (!isNaN((val as any).type)) {
                            typeIndex = (val as any).type
                        } else {
                            const valType = (val as any).type ?? allowedTypes[0];
                            typeIndex = graph.types.findIndex((typeItem: any) => {
                                if (typeItem.signature === valType) {return true}
                                if (typeItem.signature === "custom" && typeItem.extensions && valType === Object.keys(typeItem.extensions)[0]) {return true}
                            });
                        }
                    }
                }

                let typename;
                if (node.data.types[typeIndex].signature === "custom" && node.data.types[typeIndex].extensions) {
                    typename = Object.keys(node.data.types[typeIndex].extensions)[0]
                } else {
                    typename = node.data.types[typeIndex].signature;
                }

                behaveNode.values.push({id: key.replace("in-", ""), value: castParameter((val as any).value, typename), type: typeIndex})
            });
        }

        const inFlows = nodeSpec.input.flows.map((flow: IFlowSocketDescriptor) => flow.id)

        // look for all edges going into our current node which are not flows, meaning they are input value references
        edges
            .filter((edge) => edge.target === node.id)
            .filter((edge) => !isNullish(edge.targetHandle) && !isNullish(edge.sourceHandle))
            .forEach((edge) => {
                const targetNode = nodes.find(node => node.id === edge.target);
                // currently, flow/waitAll is the only node with a variable number of input flows
                if (!inFlows.includes(edge.targetHandle!) && targetNode!.type !== "flow/waitAll") {
                    // this is not an in flow edge which means it is an input value
                    behaveNode.values.push({id: edge.targetHandle, node: edge.source, socket: edge.sourceHandle})
                }
            });

        // get all edges that go out of our node which are flows
        edges
            .filter((edge) => edge.source === node.id)
            .filter((edge) => !isNullish(edge.targetHandle) && !isNullish(edge.sourceHandle))
            .forEach((edge) => {
                // look up the target in flows to determine if this edge corresponds to one of them
                const targetNode = nodes.find(node => node.id === edge.target);
                const inFlows = authoringNodeSpecs.find((nodeSpec: IAuthoringNode) => nodeSpec.type === targetNode!.type)!.input.flows.map((flow: IFlowSocketDescriptor) => flow.id)
                if (inFlows.includes(edge.targetHandle!) || targetNode!.type === "flow/waitAll") {
                    behaveNode.flows.push({id: edge.sourceHandle, node: edge.target, socket: edge.targetHandle})
                }
            });

        graph.nodes?.push(behaveNode);
    });

    topologicalSort(graph.nodes);

    return graph;
};

const isNullish = (value: any): boolean => value === undefined || value === null;

const castParameter = (value: any, signature: string) => {
    switch (signature) {
        case "bool":
            return value === "true";
        case "int":
        case "float":
            return Number(value);
        case "float2":
        case "float3":
        case "float4":
        case "float4x4":
            return value
        case "AMZN_interactivity_string":
            return String(value)
        default:
            return String(value)
    }
}

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
            const outFlowIds = node.flows.map((flow: any) => flow.node);
            for (const outflowId of outFlowIds) {
                nodeIdToInDegree.set(outflowId, nodeIdToInDegree.get(outflowId) + 1);
            }
        }
        // for value links, increase your own in degree
        if (node.values !== undefined) {
            const valueBackRefNodeIds = node.values
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
            const outFlowIds = curNode.flows.map((flow: any) => flow.node);
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

    // remove fake Links
    for (const node of nodes) {
        delete node.fakeLinks;
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
            node.flows.forEach((flow: any) => {
                flow.node = Number(`${oldIdToTopologicalId.get(flow.node)}`);
            })
        }
        if (node.values !== undefined) {
            node.values.forEach((val: any) => {
                if (val.node !== undefined) {
                    val.node = Number(`${oldIdToTopologicalId.get(val.node)}`);
                }
            })
        }

    }

}
