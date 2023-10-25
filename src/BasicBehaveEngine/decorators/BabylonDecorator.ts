import {ADecorator} from "./ADecorator";
import {BehaveEngineNode, IFlow} from "../BehaveEngineNode";
import {IBehaveEngine} from "../IBehaveEngine";
import {AbstractMesh, Quaternion} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {easeFloat, easeFloat3, easeFloat4} from "../easingUtils";
import {Scene} from "@babylonjs/core/scene";

export class BabylonDecorator extends ADecorator {
    scene: Scene;
    world: any

    constructor(behaveEngine: IBehaveEngine, world: any, scene: Scene) {
        super(behaveEngine);
        this.world = world;
        this.scene = scene;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.extractBehaveGraphFromScene = this.extractBehaveGraphFromScene

        this.behaveEngine.animateProperty = this.animateProperty
        this.registerKnownPointers();
    }

    processAddingNodeToQueue = (flow: IFlow) => {
        //pass
    }

    processExecutingNextNode = (flow: IFlow) => {
        //pass
    }

    processNodeStarted = (node: BehaveEngineNode) => {
        //pass
    }

    animateProperty = (type: string, path: string, easingType: string, easingDuration: number, initialValue: any, targetValue: any, callback: () => void) => {
        const startTime = Date.now();


        const action = async () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            const t = Math.min(elapsedDuration / easingDuration, 1);
            if (type === "float3") {
                this.behaveEngine.setPathValue(path, easeFloat3(t, initialValue, targetValue, easingType));
            } else if (type === "float4") {
                this.behaveEngine.setPathValue(path, easeFloat4(t, initialValue, targetValue, easingType));
            } else if (type === "float") {
                this.behaveEngine.setPathValue(path, easeFloat(t, initialValue, targetValue, easingType));
            }

            if (elapsedDuration >= easingDuration) {
                this.behaveEngine.setPathValue(path, targetValue);
                this.scene.unregisterBeforeRender(action);
                callback()
            }
        }

        this.scene.registerBeforeRender(action);
    }

    registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string) => {
        this.behaveEngine.registerJsonPointer(jsonPtr, getterCallback, setterCallback, typeName);
    };

    registerKnownPointers = () => {
        this.registerJsonPointer("nodes/99/scale", (path) => {
            const parts: string[] = path.split("/");
            return [(this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.x,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.y,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling = new Vector3(value[0], value[1], value[2]);
        }, "float3")

        this.registerJsonPointer("nodes/99/translation", (path) => {
            const parts: string[] = path.split("/");
            return [(this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.x,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.y,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position= new Vector3(value[0], value[1], value[2]);
        }, "float3")

        this.registerJsonPointer("nodes/99/rotation", (path) => {
            const parts: string[] = path.split("/");
            return [
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).rotationQuaternion?.w,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).rotationQuaternion?.x,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).rotationQuaternion?.y,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).rotationQuaternion?.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).rotationQuaternion = new Quaternion(value[1], value[2], value[3], value[0]);
        }, "float4")
    }

    public extractBehaveGraphFromScene = (): any => {
        if ((this.scene as never)['extras'] === undefined || (this.scene as never)['extras']['behaveGraph'] === undefined) {
            console.info('No behavior found in scene');
            return;
        }

        return (this.scene as never)['extras']['behaveGraph'];
    };
}
