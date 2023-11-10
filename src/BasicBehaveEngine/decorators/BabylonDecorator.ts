import {ADecorator} from "./ADecorator";
import {BehaveEngineNode, IFlow} from "../BehaveEngineNode";
import {IBehaveEngine} from "../IBehaveEngine";
import {AbstractMesh, Matrix, PointerEventTypes, Quaternion} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {easeFloat, easeFloat3, easeFloat4} from "../easingUtils";
import {Scene} from "@babylonjs/core/scene";
import {OnSelect} from "../nodes/experimental/OnSelect";

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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.alertParentOnSelect = this.alertParentOnSelect
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.addNodeClickedListener = this.addNodeClickedListener

        this.behaveEngine.animateProperty = this.animateProperty
        this.registerKnownPointers();
        this.registerBehaveEngineNode("node/OnSelect", OnSelect);
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

    registerEngineCallback = (path: string, callback: (value: any, onComplete: ()=> void) => void) => {
        this.behaveEngine.registerEngineCallback(path, callback);
    }

    registerKnownPointers = () => {
        const gltfNodesSize:number = this.world.glTFNodes.length;

        this.registerEngineCallback(`playAnimation`, (value, onComplete) => {
            // Note : targetTime not yet implemented to do something yet
            const {animation, speed, loopCount, targetTime} = value;
            const animationGroup = this.scene.animationGroups[animation];

            animationGroup.speedRatio = speed;

            // run infinitely
            if (loopCount <= 0) {
                animationGroup.start(true, speed);
            }
            else {
                let count = loopCount;
                animationGroup.start(false, speed);
                animationGroup.onAnimationGroupEndObservable.add(function() {
                    -- count;
                    if (count > 0) {
                        animationGroup.start(false, speed);
                    } else {
                        onComplete();
                    }
                });
            }
        });

        for (let i = 0; i < gltfNodesSize; i++) {
            this.registerJsonPointer(`nodes/${i}/scale`, (path) => {
                const parts: string[] = path.split("/");
                return [(this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.x,
                    (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.y,
                    (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.z];
            }, (path, value) => {
                const parts: string[] = path.split("/");
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling = new Vector3(value[0], value[1], value[2]);
            }, "float3")
    
            this.registerJsonPointer(`nodes/${i}/translation`, (path) => {
                const parts: string[] = path.split("/");
                return [(this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.x,
                    (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.y,
                    (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.z];
            }, (path, value) => {
                const parts: string[] = path.split("/");
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position= new Vector3(value[0], value[1], value[2]);
            }, "float3")
    
            this.registerJsonPointer(`nodes/${i}/rotation`, (path) => {
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
    }

    public extractBehaveGraphFromScene = (): any => {
        if ((this.scene as never)['extras'] === undefined || (this.scene as never)['extras']['behaveGraph'] === undefined) {
            console.info('No behavior found in scene');
            return;
        }

        return (this.scene as never)['extras']['behaveGraph'];
    };

    public addNodeClickedListener = (nodeIndex: number, callback: (localHitLocation: number[], hitNodeIndex: number) => void): void => {
        this.world.glTFNodes[nodeIndex].metadata = this.world.glTFNodes[nodeIndex].metadata || {};
        this.world.glTFNodes[nodeIndex].metadata.onSelectCallback = callback;

        this.scene.onPointerObservable.add(async (pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERPICK) {
                const ray = this.scene.createPickingRay(
                    this.scene.pointerX,
                    this.scene.pointerY,
                    Matrix.Identity(),
                    this.scene.activeCamera,
                );

                const hit = this.scene.pickWithRay(ray);
                if (hit == null || hit.pickedMesh == null) {
                    return;
                }
                const targetMesh: AbstractMesh = this.world.glTFNodes[nodeIndex];
                if (targetMesh !== hit.pickedMesh && (!targetMesh.getChildMeshes(false).includes(hit.pickedMesh))) {
                    return;
                } else if (targetMesh.getChildMeshes(false).includes(hit.pickedMesh) && hit.pickedMesh.metadata.onSelectCallback != null) {
                    return;
                } else {
                    const pos = [hit.pickedMesh.position.x, hit.pickedMesh.position.y, hit.pickedMesh.position.z];
                    const hitNodeIndex = this.world.glTFNodes.findIndex((value: { uniqueId: number; }) => value.uniqueId === hit.pickedMesh!.uniqueId)
                    callback(pos, hitNodeIndex);
                }
            }
        });
    }

    public alertParentOnSelect = (localHitLocation: number[], hitNodeIndex: number, childNodeIndex: number): void => {
        let curNode = this.world.glTFNodes[childNodeIndex].parent;
        while (curNode !== null && (curNode.metadata == null || curNode.metadata.onSelectCallback == null)) {
            curNode = curNode.parent;
        }

        if (curNode !== null) {
            curNode.metadata.onSelectCallback(localHitLocation, hitNodeIndex);
        }
    }
}
