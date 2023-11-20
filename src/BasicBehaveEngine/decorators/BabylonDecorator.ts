import {ADecorator} from "./ADecorator";
import {BehaveEngineNode, IFlow} from "../BehaveEngineNode";
import {IBehaveEngine} from "../IBehaveEngine";
import {AbstractMesh, AnimationGroup, float, Matrix, PointerEventTypes, Quaternion} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {easeFloat, easeFloat3, easeFloat4} from "../easingUtils";
import {Scene} from "@babylonjs/core/scene";
import {OnSelect} from "../nodes/experimental/OnSelect";
import {WorldStopAnimation} from "../nodes/experimental/WorldStopAnimation";
import {WorldStartAnimation} from "../nodes/experimental/WorldStartAnimation";

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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.playAnimation = this.playAnimation
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.cancelAnimation = this.cancelAnimation
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.stopAnimation = this.stopAnimation
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.startAnimation = this.startAnimation

        this.behaveEngine.animateProperty = this.animateProperty
        this.registerKnownPointers();
        this.registerBehaveEngineNode("node/OnSelect", OnSelect);
        this.registerBehaveEngineNode("world/stopAnimation", WorldStopAnimation);
        this.registerBehaveEngineNode("world/startAnimation", WorldStartAnimation);
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

    animateProperty = (type: string, path: string, easingType: number, easingDuration: number, initialValue: any, targetValue: any, callback: () => void) => {
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
        const maxGltfNode:number = this.world.glTFNodes.length-1;

        this.registerJsonPointer(`nodes/${maxGltfNode}/scale`, (path) => {
            const parts: string[] = path.split("/");
            return [(this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.x,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.y,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).scaling = new Vector3(value[0], value[1], value[2]);
        }, "float3")

        this.registerJsonPointer(`nodes/${maxGltfNode}/translation`, (path) => {
            const parts: string[] = path.split("/");
            return [(this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.x,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.y,
                (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            console.log(value);
            (this.world.glTFNodes[Number(parts[1])] as AbstractMesh).position= new Vector3(value[0], value[1], value[2]);
        }, "float3")

        this.registerJsonPointer(`nodes/${maxGltfNode}/rotation`, (path) => {
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
                if (targetMesh !== hit.pickedMesh && targetMesh.id !== hit.pickedMesh.id && (!targetMesh.getChildMeshes(false).includes(hit.pickedMesh))) {
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

    public startAnimation = (animation: number, startTime: number, endTime: number, speed: number,  callback: () => void): void => {
        const fps = 60;
        const startFrame: number = startTime * fps;
        const endFrame: number = endTime * fps;

        const anim: AnimationGroup = this.world.animations[animation]
        anim.metadata = anim.metadata || {};

        const loopingForever = !isFinite(endFrame);
        const forward = startFrame < endFrame;

        if (!loopingForever) {
            const loops = Math.abs(endFrame - startFrame)/(anim.to - anim.from);
            if (forward) {
                if (loops > 1) {
                    let count = 0;
                    this._animateRange(speed, true, true, anim.from, anim.to, startFrame, anim, undefined, () => {
                        count++;
                        if (count > loops) {
                            this._animateRange(speed, true, false, anim.from, endFrame % anim.to, anim.from, anim,
                                callback, undefined);
                        }
                    })
                } else if (endFrame <= anim.to) {
                    this._animateRange(speed, true, false, startFrame, endFrame, startFrame, anim, callback, undefined);
                } else {
                    this._animateRange(speed, true, false, startFrame, anim.to, startFrame, anim, () => {
                        this._animateRange(speed, true, false, anim.from, endFrame - anim.to, anim.to, anim, callback, undefined);
                    }, undefined)
                }
            } else {
                if (loops > 1) {
                    let count = 0;
                    this._animateRange(speed, false, true, anim.to, anim.from, startFrame, anim, undefined, () => {
                        count++;
                        if (count > loops) {
                            this._animateRange(speed, false, false, anim.to, anim.from  - ((endFrame - startFrame) % (anim.to - anim.from)), anim.to, anim,
                                callback, undefined);
                        }
                    })
                } else if (endFrame >= 0) {
                    this._animateRange(speed, false, false, startFrame, endFrame, startFrame, anim, callback, undefined);
                } else {
                    this._animateRange(speed, false, false, startFrame, anim.from, startFrame, anim, () => {
                        this._animateRange(speed, false, false, anim.to, endFrame + anim.to, anim.to, anim, callback, undefined);
                    }, undefined)
                }
            }
        } else {
            if (forward) {
                //forward
                this._animateRange(speed, true, true, anim.from, anim.to, startFrame, anim, undefined,undefined);
            } else {
                //backwards
                this._animateRange(speed, false, true, anim.to, anim.from, startFrame, anim, undefined, undefined);
            }
        }
    }

    public stopAnimation = (animationIndex: number, stopMode: number, exactFrameTime: number | undefined, callback: (time: number) => void): void => {
        const animation: AnimationGroup = this.world.animations[animationIndex]
        const animationInstance: AnimationGroup = animation.metadata.instance;
        if (animationInstance === undefined) return;
        if (stopMode === 0) {
            const frame = animationInstance.animatables[0].masterFrame;
            const fps = 60;
            const time: number = frame / fps;
            animationInstance.stop();
            animationInstance.dispose();
            animation.metadata.instance = undefined;
            callback(time);
        } else if (stopMode === 1) {
            const forward = animationInstance.metadata.isForward;
            if (animationInstance.animatables[0] === undefined) {return}
            const frame = animationInstance.animatables[0].masterFrame;
            const fps = 60;
            const stopFrame = exactFrameTime! * fps;
            this._animateRange(animationInstance.speedRatio, forward, false, frame, stopFrame, frame, animation, () => callback(exactFrameTime!), undefined);
        } else {
            throw Error(`Invalid stop Mode ${stopMode}`);
        }
    }

    private _animateRange = (speed: float, isForward: boolean, isLoop: boolean, startFrame: float, endFrame: float, currentFrame: float,
                             animation: AnimationGroup, endCallback: (() => void) | undefined, loopCallback: (() => void )| undefined) => {
        if (animation.metadata.instance !== undefined) {
            //clear any previous animation
            if (animation.metadata.instance.isPlaying) {
                animation.metadata.instance.stop();
                animation.metadata.instance.dispose();
            }
            animation.metadata.instance = undefined;
        }

        const animationInstance: AnimationGroup = animation.clone(`${animation.name}-instance`);
        animation.metadata.instance = animationInstance;
        animation.metadata.instance.metadata = animation.metadata.instance.metadata || {};
        animation.metadata.instance.metadata.isForward = isForward;

        animationInstance.start(isLoop, speed, startFrame, endFrame, false);

        if (isLoop) {
            animationInstance.goToFrame(currentFrame);
        }


        if (endCallback !== undefined) {
            animationInstance.onAnimationGroupEndObservable.add(endCallback);
        }
        if (loopCallback !== undefined) {
            animationInstance.onAnimationGroupLoopObservable.add(loopCallback);
        }
    }
}
