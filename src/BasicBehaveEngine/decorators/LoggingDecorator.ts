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
        this.behaveEngine.animateProperty = this.animateProperty;
        this.behaveEngine.getWorld = this.getWorld;

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

    getWorld = (): any => {
        console.log(this.world)
        return this.world;
    }

    registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string) => {
        this.behaveEngine.registerJsonPointer(jsonPtr, getterCallback, setterCallback, typeName);
    };

    animateCubicBezier = (path: string, p1: number[], p2: number[], initialValue: any, targetValue: any, duration: number, valueType: string, callback: () => void): void => {
        this.behaveEngine.getWorldAnimationPathCallback(path)?.cancel();

        const animatePropertyCallback = setTimeout(() => {
            this.behaveEngine.setPathValue(path, targetValue);
            callback();
            this.behaveEngine.setWorldAnimationPathCallback(path, undefined);
        }, duration * 1000);

        const cancel = () => {
            clearTimeout(animatePropertyCallback);
            this.behaveEngine.setWorldAnimationPathCallback(path, undefined);
        }
        this.setWorldAnimationPathCallback(path, {cancel: cancel} );
    }


    animateProperty = (path: string, easingParameters: any, callback: () => void) => {
        this.behaveEngine.getWorldAnimationPathCallback(path)?.cancel();

        const animatePropertyCallback = setTimeout(() => {
            this.behaveEngine.setPathValue(path, easingParameters.targetValue);
            callback();
            this.behaveEngine.setWorldAnimationPathCallback(path, undefined);
        }, easingParameters.easingDuration * 1000);

        const cancel = () => {
            clearTimeout(animatePropertyCallback);
            this.behaveEngine.setWorldAnimationPathCallback(path, undefined);
        }
        this.setWorldAnimationPathCallback(path, {cancel: cancel} );
    }

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
        }, "float3")

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
        }, 'float4')

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
        }, 'float3')
    }
}
