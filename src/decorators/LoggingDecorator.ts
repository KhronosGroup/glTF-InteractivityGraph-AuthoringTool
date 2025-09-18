import {ADecorator} from "../BasicBehaveEngine/ADecorator";
import {BehaveEngineNode} from "../BasicBehaveEngine/BehaveEngineNode";
import {IBehaveEngine, IEventQueueItem} from "../BasicBehaveEngine/IBehaveEngine";
import {IInteractivityFlow} from "../BasicBehaveEngine/types/InteractivityGraph";
import { cubicBezier, linearFloat, slerpFloat4 } from "../BasicBehaveEngine/easingUtils";
export class LoggingDecorator extends ADecorator {
    addToLog: (line: string) => void;
    world: any;

    constructor(behaveEngine: IBehaveEngine, addToLog: (line: string) => void, world: any) {
        super(behaveEngine);
        this.addToLog = addToLog;
        this.world = world;
        this.behaveEngine.processAddingNodeToQueue = this.processAddingNodeToQueue;
        this.behaveEngine.processExecutingNextNode = this.processExecutingNextNode;
        this.behaveEngine.processNodeStarted = this.processNodeStarted;
        this.behaveEngine.getWorld = this.getWorld;

        this.registerKnownPointers();
    }

    processAddingNodeToQueue = (flow: IInteractivityFlow) => {
        this.addToLog(`Adding ${JSON.stringify(flow)} flow to queue`);
    }

    processExecutingNextNode = (flow: IInteractivityFlow) => {
        this.addToLog(`Executing ${JSON.stringify(flow)} flow`);
    }

    processNodeStarted = (node: BehaveEngineNode) => {
        this.addToLog(`Running ${node.name}: input values: ${JSON.stringify(node.values)}, output flows: ${JSON.stringify(node.flows)}`)
    }

    getWorld = (): any => {
        console.log(this.world)
        return this.world;
    }

    registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string, readOnly: boolean) => {
        this.behaveEngine.registerJsonPointer(jsonPtr, getterCallback, setterCallback, typeName, readOnly);
    };

    registerKnownPointers = () => {
        this.behaveEngine.registerJsonPointer("/nodes/99/scale", (path) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[2])] && this.world.nodes[Number(parts[2])].scale !== undefined) {
                return this.world.nodes[Number(parts[2])].scale
            } else {
                return undefined
            }
        }, (path, value) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[2])] && this.world.nodes[Number(parts[2])].scale !== undefined) {
                this.world.nodes[Number(parts[2])].scale = value
            }
        }, "float3", false)

        this.registerJsonPointer("/nodes/99/rotation", (path) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[2])] && this.world.nodes[Number(parts[2])].rotation !== undefined) {
                return this.world.nodes[Number(parts[2])].rotation
            } else {
                return undefined
            }
        }, (path, value) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[2])] && this.world.nodes[Number(parts[2])].rotation !== undefined) {
                this.world.nodes[Number(parts[2])].rotation = value
            }
        }, 'float4', false)

        this.registerJsonPointer("/nodes/99/translation", (path) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[2])] && this.world.nodes[Number(parts[2])].translation !== undefined) {
                return this.world.nodes[Number(parts[2])].translation
            } else {
                return undefined
            }
        }, (path, value) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[2])] && this.world.nodes[Number(parts[2])].translation !== undefined) {
                this.world.nodes[Number(parts[2])].translation = value
            }
        }, 'float3', false)
    }
}
