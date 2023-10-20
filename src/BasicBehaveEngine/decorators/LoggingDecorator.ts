import {ADecorator} from "./ADecorator";
import {BehaveEngineNode, IFlow} from "../BehaveEngineNode";
import {IBehaveEngine} from "../IBehaveEngine";

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
        this.behaveEngine.animateProperty = this.animateProperty

        this.registerKnownPointers();
    }

    processAddingNodeToQueue = (flow: IFlow) => {
        this.addToLog(`Adding ${JSON.stringify(flow)} flow to queue`);
    }

    processExecutingNextNode = (flow: IFlow) => {
        this.addToLog(`Executing ${JSON.stringify(flow)} flow`);
    }

    processNodeStarted = (node: BehaveEngineNode) => {
        this.addToLog(`Running ${node.name}: input values: ${JSON.stringify(node.values)}, output flows: ${JSON.stringify(node.flows)}`)
    }

    registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string) => {
        this.behaveEngine.registerJsonPointer(jsonPtr, getterCallback, setterCallback, typeName);
    };

    animateProperty = (type: string, path: string, easingType: string, easingDuration: number, initialValue: any, targetValue: any, callback: () => void) => {
        setTimeout(() => {
            this.behaveEngine.setPathValue(path, targetValue);
            callback()
        }, easingDuration * 1000)
    }

    registerKnownPointers = () => {
        this.behaveEngine.registerJsonPointer("nodes/99/scale", (path) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[1])] && this.world.nodes[Number(parts[1])].scale !== undefined) {
                return this.world.nodes[Number(parts[1])].scale
            } else {
                return undefined
            }
        }, (path, value) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[1])] && this.world.nodes[Number(parts[1])].scale !== undefined) {
                this.world.nodes[Number(parts[1])].scale = value
            }
        }, "float3")

        this.registerJsonPointer("nodes/99/rotation", (path) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[1])] && this.world.nodes[Number(parts[1])].rotation !== undefined) {
                return this.world.nodes[Number(parts[1])].rotation
            } else {
                return undefined
            }
        }, (path, value) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[1])] && this.world.nodes[Number(parts[1])].rotation !== undefined) {
                this.world.nodes[Number(parts[1])].rotation = value
            }
        }, 'float3')

        this.registerJsonPointer("nodes/99/translation", (path) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[1])] && this.world.nodes[Number(parts[1])].translation !== undefined) {
                return this.world.nodes[Number(parts[1])].translation
            } else {
                return undefined
            }
        }, (path, value) => {
            const parts: string[] = path.split("/");
            if (this.world.nodes && this.world.nodes[Number(parts[1])] && this.world.nodes[Number(parts[1])].translation !== undefined) {
                this.world.nodes[Number(parts[1])].translation = value
            }
        }, 'float3')
    }

}
