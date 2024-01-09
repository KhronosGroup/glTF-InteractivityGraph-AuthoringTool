import { Edge, Node } from "reactflow";
import { v4 as uuidv4 } from "uuid";
import {ICustomEvent, IVariable} from "./AuthoringNodeSpecs";

/**
 * Converts a Behave graph represented as a JSON string into ReactFlow-compatible data structures.
 *
 * @param graph - The Behave graph in JSON format.
 * @returns An array containing ReactFlow nodes, edges, custom events, and variables.
 */
export const behaveToAuthor = (graph: string): [Node[], Edge[], ICustomEvent[], IVariable[]] => {
  const graphJson = JSON.parse(graph);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const customEvents: ICustomEvent[] = graphJson.customEvents;
  const variables: IVariable[] = graphJson.variables;

  // loop through all the nodes in our behave graph to extract nodes and edges
  let id = 0;
  graphJson.nodes.forEach((nodeJSON: any) => {
    // construct and add the node to the nodes list
    const node: Node = {
      id: String(id),
      type: nodeJSON.type,
      position: {
        x: nodeJSON.metadata?.positionX
          ? Number(nodeJSON.metadata?.positionX)
          : 0,
        y: nodeJSON.metadata?.positionY
          ? Number(nodeJSON.metadata?.positionY)
          : 0,
      },
      data: {} as { [key: string]: any },
    };
    nodes.push(node);

    // add configuration
    node.data.configuration = {}
    if (nodeJSON.configuration) {
      for (const config of nodeJSON.configuration) {
        node.data.configuration[config.id] = config.value;
      }
    }

    //add custom events and variables
    node.data.customEvents = graphJson.customEvents;
    node.data.variables = graphJson.variables;
    node.data.types = graphJson.types;

    // to keep track of if there is a link for this value
    node.data.linked = {}
    node.data.values = {}
    if (nodeJSON.values) {
      for (const val of nodeJSON.values) {
        if (val.node !== undefined) {
          // if the value is derived from the output of another node, create an edge linking to that node
          edges.push({
            id: uuidv4(),
            source: String(val.node),
            sourceHandle: val.socket,
            target: String(id),
            targetHandle: val.id,
          });
          node.data.linked[val.id] = true;
        } else if (val.value !== undefined) {
          // if the value is a value, we can just get it from the node json
          node.data.values[val.id] = {value: val.value, type: val.type};
        }
      }
    }

    // flows will always be references to other nodes output flows, so for each flow create a backreference edge
    if (nodeJSON.flows) {
      for (const flow of nodeJSON.flows) {
        edges.push({
          id: uuidv4(),
          source: String(id),
          sourceHandle: flow.id,
          target: String(flow.node),
          targetHandle: flow.socket,
        });
      }
    }

    id++;
  });

  // set up structure for nodes if one does not exist
  if (!nodes.some(node => node.position.y !== 0 || node.position.x !== 0)) {
    const nodeNumbers: number[] = Array(nodes.length).fill(null).map((_, i) => i);

    let lastLayer: number[] = nodeNumbers.filter(num => !edges.some(edge => Number(edge.target) === num));
    for (let i = 0; i < lastLayer.length; i++) {
      nodes[lastLayer[i]].position.x = -500;
      nodes[lastLayer[i]].position.y = 500 * i;
    }

    let nextLayer: number[] = [];
    for (const nodeIndex of lastLayer) {
      const nodeOutEdges: Edge[] = edges.filter(edge => Number(edge.source) === nodeIndex);
      nextLayer.push(...nodeOutEdges.map(edge => Number(edge.target)));
    }
    nextLayer = [...new Set(nextLayer)]

    let xOffset = 0;
    while (nextLayer.length > 0) {
      lastLayer = nextLayer;
      for (let i = 0; i < lastLayer.length; i++) {
        nodes[lastLayer[i]].position.x = xOffset;
        nodes[lastLayer[i]].position.y = 500 * i;
      }

      nextLayer = [];
      for (const nodeIndex of lastLayer) {
        const nodeOutEdges: Edge[] = edges.filter(edge => Number(edge.source) === nodeIndex);
        nextLayer.push(...nodeOutEdges.map(edge => Number(edge.target)));
      }
      nextLayer = [...new Set(nextLayer)];
      xOffset += 500;
    }
  }

  return [nodes, edges, customEvents, variables];
};
