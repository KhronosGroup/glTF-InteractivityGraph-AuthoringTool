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
        this.behaveEngine.animateProperty = this.animateProperty;
        this.behaveEngine.animateCubicBezier = this.animateCubicBezier;
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

    animateCubicBezier = (path: string, p1: number[], p2: number[], initialValue: any, targetValue: any, duration: number, valueType: string, callback: () => void): void => {
        this.behaveEngine.clearPointerInterpolation(path);

        const startTime = Date.now();
        const interpolationAction = () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            const t = Math.min(elapsedDuration / duration, 1);
            const p = cubicBezier(t, {x: 0, y:0}, {x: p1[0], y:p1[1]}, {x: p2[0], y:p2[1]}, {x: 1, y:1});
            if (valueType === "float3") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1]), linearFloat(p.y, initialValue[2], targetValue[2])]
                this.behaveEngine.setPathValue(path, value);
            } else if (valueType === "float4") {
                if (this.isSlerpPath(path)) {
                    const value = slerpFloat4(p.y, initialValue, targetValue);
                    this.behaveEngine.setPathValue(path, value);
                } else {
                    const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1]), linearFloat(p.y, initialValue[2], targetValue[2]), linearFloat(p.y, initialValue[3], targetValue[3])]
                    this.behaveEngine.setPathValue(path, value);
                }
            } else if (valueType === "float") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0])]
                this.behaveEngine.setPathValue(path, value);
            } else if (valueType == "float2") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1])]
                this.behaveEngine.setPathValue(path, value);
            }

            if (elapsedDuration >= duration) {
                this.behaveEngine.setPathValue(path, targetValue);
                this.behaveEngine.clearPointerInterpolation(path);
                callback()
            }
        }
    
        this.behaveEngine.setPointerInterpolationCallback(path, {action: interpolationAction} );
    }


    animateProperty = (path: string, easingParameters: any, callback: () => void) => {
        this.behaveEngine.clearPointerInterpolation(path);

        const startTime = Date.now();
        const action = () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            if (elapsedDuration >= easingParameters.easingDuration) {
                this.behaveEngine.setPathValue(path, easingParameters.targetValue);
                callback();
                this.behaveEngine.clearPointerInterpolation(path);
            }
        }
        this.behaveEngine.setPointerInterpolationCallback(path, {action: action} );
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
