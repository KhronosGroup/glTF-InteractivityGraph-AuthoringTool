import { Animation, TransformNode } from "@babylonjs/core";
import type { IAnimatable } from "@babylonjs/core/Animations/animatable.interface";
import { AnimationPropertyInfo, getQuaternion, getVector3 } from "@babylonjs/loaders/glTF/2.0/glTFLoaderAnimation";
import type { GLTFLoader } from "@babylonjs/loaders/glTF/2.0/glTFLoader";
import type { IAnimation, IAnimationChannel } from "@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces";
import { BabylonAssetModel, BabylonAssetNode } from "../components/engineViews/babylonAssetModel";

class AssetAnimationProperty extends AnimationPropertyInfo {
    buildAnimations(target: BabylonAssetNode | TransformNode, name: string, fps: number, keys: any[], onLoad: (target: IAnimatable, animation: Animation) => void): void {
        const animation = this._buildAnimation(name, fps, keys);
        target.animations.push(animation);
        onLoad(target, animation);
    }
}

/** Keep animations on the same transform or morph state exposed by node pointers. */
export function loadBabylonAssetAnimationChannel(loader: GLTFLoader, model: BabylonAssetModel | undefined, context: string, animationContext: string,
    animation: IAnimation, channel: IAnimationChannel, onLoad: (target: IAnimatable, animation: Animation) => void): Promise<void> | null {
    const index = channel.target.node;
    if (index === undefined || !model) return null;
    const definition = loader.gltf.nodes?.[index];
    if (!definition) return null;
    const path = channel.target.path;
    const skinTransform = path === "weights" ? undefined : definition._babylonTransformNodeForSkin;
    if (definition._babylonTransformNode && !skinTransform) return null;
    if (path !== "weights" && !loader.parent.loadNodeAnimations && !definition._isJoint) return null;
    const node = model.nodes[index];
    let properties: AnimationPropertyInfo[];
    if (path === "weights") {
        properties = node.weights.map((_, slot) => new AssetAnimationProperty(Animation.ANIMATIONTYPE_FLOAT, `weights.${slot}`,
            (_target, values, offset, scale) => values[offset + slot] * scale, () => node.weights.length));
    } else if (path === "rotation") {
        properties = [new AssetAnimationProperty(Animation.ANIMATIONTYPE_QUATERNION, "rotationQuaternion",
            getQuaternion, () => 4)];
    } else if (path === "translation" || path === "scale") {
        properties = [new AssetAnimationProperty(Animation.ANIMATIONTYPE_VECTOR3, path === "translation" ? "position" : "scaling",
            getVector3, () => 3)];
    } else return null;
    return loader._loadAnimationChannelFromTargetInfoAsync(context, animationContext, animation, channel, { object: skinTransform ?? node, info: properties }, onLoad);
}
