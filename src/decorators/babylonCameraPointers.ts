import { Camera, Quaternion, TargetCamera, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";

import { BabylonAssetModel } from "../components/engineViews/babylonAssetModel";

type Bind = (path: string, type: string, get: () => number[], set?: (value: number[]) => void, readOnly?: boolean) => void;
interface Definition {
    perspective?: { aspectRatio?: number; yfov: number; znear: number; zfar?: number };
    orthographic?: { xmag: number; ymag: number; znear: number; zfar: number };
}
type TaggedCamera = Camera & { _internalMetadata?: { gltf?: { pointers?: string[] } } };

export function registerBabylonCameraPointers(scene: Scene, bind: Bind, assetModel?: BabylonAssetModel): void {
    const prefix = "/extensions/KHR_interactivity/activeCamera/";
    bind(prefix + "position", "float3", () => {
        const camera = scene.activeCamera;
        if (!camera) return [NaN, NaN, NaN];
        camera.getViewMatrix(true);
        const p = camera.globalPosition;
        return [scene.useRightHandedSystem ? p.x : -p.x, p.y, p.z];
    }, undefined, true);
    bind(prefix + "rotation", "float4", () => {
        const camera = scene.activeCamera;
        if (!(camera instanceof TargetCamera)) return [NaN, NaN, NaN, NaN];
        camera.getViewMatrix(true);
        // Rebuild from view direction instead of decomposing: glTF cameras in a left-handed
        // scene have a mirrored world matrix, which decompose() resolves by flipping an axis.
        const rh = scene.useRightHandedSystem;
        const world = camera.getWorldMatrix();
        const toGltf = (v: Vector3): Vector3 => (rh ? v : new Vector3(-v.x, v.y, v.z));
        const back = toGltf(Vector3.TransformNormal(new Vector3(0, 0, rh ? 1 : -1), world)).normalize();
        const right = Vector3.Cross(toGltf(Vector3.TransformNormal(Vector3.Up(), world)), back).normalize();
        return Quaternion.RotationQuaternionFromAxis(right, Vector3.Cross(back, right), back).normalize().asArray();
    }, undefined, true);
    for (const mode of ["perspective", "orthographic"] as const) {
        const fields = mode === "perspective" ? ["aspectRatio", "yfov", "znear", "zfar"] : ["xmag", "ymag", "znear", "zfar"];
        for (const field of fields) bind(prefix + mode + "/" + field, "float", () => {
            const camera = scene.activeCamera;
            if (!camera || (camera.mode === Camera.PERSPECTIVE_CAMERA) !== (mode === "perspective")) return [NaN];
            const m = camera.getProjectionMatrix().m;
            if (field === "znear") return [camera.minZ];
            if (field === "zfar") return [camera.maxZ === 0 ? Infinity : camera.maxZ];
            if (field === "aspectRatio") return [Math.abs(m[5] / m[0])];
            if (field === "yfov") return [Math.atan((m[9] + 1) / m[5]) - Math.atan((m[9] - 1) / m[5])];
            return [Math.abs(1 / m[field === "xmag" ? 0 : 5])];
        }, undefined, true);
    }

    const definitions: Definition[] = assetModel?.cameras ?? scene.metadata?.gltfCameraDefinitions ?? [];
    definitions.forEach((definition, index) => {
        const cameras = (assetModel?.nativeCameras ?? scene.cameras).filter(camera => (camera as TaggedCamera)._internalMetadata?.gltf?.pointers?.includes(`/cameras/${index}`));
        const mode = definition.perspective ? "perspective" : "orthographic";
        const source = definition.perspective ?? definition.orthographic;
        if (!source) return;
        let aspect = definition.perspective?.aspectRatio;
        const update = (camera: Camera): void => {
            camera.unfreezeProjectionMatrix();
            if (mode === "perspective" && aspect !== undefined) {
                camera.fovMode = Camera.FOVMODE_VERTICAL_FIXED;
                const projection = camera.getProjectionMatrix(true).clone();
                projection.setRowFromFloats(0, projection.m[5] / aspect, 0, 0, 0);
                camera.freezeProjectionMatrix(projection);
            } else camera.getProjectionMatrix(true);
        };
        cameras.forEach(update);
        const fields = mode === "perspective" ? ["aspectRatio", "yfov", "znear", "zfar"] : ["xmag", "ymag", "znear", "zfar"];
        for (const field of fields.filter(field => Object.prototype.hasOwnProperty.call(source, field))) {
            const path = `/cameras/${index}/${mode}/${field}`;
            const camera = cameras[0];
            bind(path, "float", () => {
                if (!camera) return [(source as unknown as Record<string, number>)[field]];
                if (field === "aspectRatio") return [aspect!];
                if (field === "yfov") return [camera.fov];
                if (field === "znear") return [camera.minZ];
                if (field === "zfar") return [camera.maxZ === 0 ? Infinity : camera.maxZ];
                return [field === "xmag" ? ((camera.orthoRight ?? 0) - (camera.orthoLeft ?? 0)) / 2 : ((camera.orthoTop ?? 0) - (camera.orthoBottom ?? 0)) / 2];
            }, value => {
                (source as unknown as Record<string, number>)[field] = value[0];
                if (field === "aspectRatio") aspect = value[0];
                cameras.forEach(c => {
                    if (field === "yfov") c.fov = value[0];
                    else if (field === "znear") c.minZ = value[0];
                    else if (field === "zfar") c.maxZ = value[0] === Infinity ? 0 : value[0];
                    else if (field === "xmag") { c.orthoLeft = -value[0]; c.orthoRight = value[0]; }
                    else if (field === "ymag") { c.orthoBottom = -value[0]; c.orthoTop = value[0]; }
                    update(c);
                });
            });
        }
    });
}
