import { Camera, Quaternion, TargetCamera } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";

type Bind = (path: string, type: string, get: () => number[], set?: (value: number[]) => void, readOnly?: boolean) => void;
interface Definition {
    perspective?: { aspectRatio?: number; yfov: number; znear: number; zfar?: number };
    orthographic?: { xmag: number; ymag: number; znear: number; zfar: number };
}
type TaggedCamera = Camera & { _internalMetadata?: { gltf?: { pointers?: string[] } } };

export function registerBabylonCameraPointers(scene: Scene, bind: Bind): void {
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
        const rotation = camera.absoluteRotation;
        if (scene.useRightHandedSystem) return rotation.asArray();
        const q = new Quaternion(0, 1, 0, 0).multiply(rotation);
        return [q.x, -q.y, q.z, q.w];
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

    const definitions: Definition[] = scene.metadata?.gltfCameraDefinitions ?? [];
    definitions.forEach((definition, index) => {
        const cameras = scene.cameras.filter(camera => (camera as TaggedCamera)._internalMetadata?.gltf?.pointers?.includes(`/cameras/${index}`));
        if (!cameras.length) return;
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
                if (field === "aspectRatio") return [aspect!];
                if (field === "yfov") return [camera.fov];
                if (field === "znear") return [camera.minZ];
                if (field === "zfar") return [camera.maxZ === 0 ? Infinity : camera.maxZ];
                return [field === "xmag" ? ((camera.orthoRight ?? 0) - (camera.orthoLeft ?? 0)) / 2 : ((camera.orthoTop ?? 0) - (camera.orthoBottom ?? 0)) / 2];
            }, value => {
                cameras.forEach(c => {
                    if (field === "aspectRatio") aspect = value[0];
                    else if (field === "yfov") c.fov = value[0];
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
