/* eslint-disable @typescript-eslint/no-explicit-any */
import { readAccessorComponents } from "./glTFAccessors";

export interface RuntimeAnimationChannel {
    targetNode: number;
    targetPath: string;
    interpolation: string;
    input: number[];
    output: number[][];
}

export function createObjectModelAnimation(animation: any, gltf: any): any {
    if (animation.runtimeChannels !== undefined) {
        return {
            ...cloneValue(animation),
            runtimeChannels: cloneValue(animation.runtimeChannels),
            playhead: animation.playhead ?? 0,
            virtualPlayhead: animation.virtualPlayhead ?? 0,
            minTime: animation.minTime,
            maxTime: animation.maxTime,
            isPlaying: animation.isPlaying ?? false,
        };
    }
    const runtimeChannels = createRuntimeAnimationChannels(animation, gltf);
    const inputTimes = runtimeChannels.flatMap((channel) => channel.input);
    const minTime = inputTimes.length > 0 ? Math.min(...inputTimes) : NaN;
    const maxTime = inputTimes.length > 0 ? Math.max(...inputTimes) : NaN;
    return {
        ...cloneValue(animation),
        runtimeChannels,
        playhead: 0,
        virtualPlayhead: 0,
        minTime,
        maxTime,
        isPlaying: false,
    };
}

export function effectiveAnimationTime(animation: any, requestedTime: number): number {
    const maxTime = Number(animation.maxTime);
    if (!Number.isFinite(maxTime) || maxTime === 0) {
        return 0;
    }
    const iteration = requestedTime > 0 ? Math.ceil((requestedTime - maxTime) / maxTime) : Math.floor(requestedTime / maxTime);
    return requestedTime - iteration * maxTime;
}

export function sampleAnimationChannel(channel: RuntimeAnimationChannel, time: number): number[] {
    const times = channel.input;
    if (times.length === 0) {
        return [];
    }
    if (time <= times[0]) {
        return animationOutputValue(channel, 0);
    }
    const lastIndex = times.length - 1;
    if (time >= times[lastIndex]) {
        return animationOutputValue(channel, lastIndex);
    }

    const nextIndex = times.findIndex((nextTime) => nextTime > time);
    const previousIndex = Math.max(0, nextIndex - 1);
    if (channel.interpolation === "STEP") {
        return animationOutputValue(channel, previousIndex);
    }

    const t0 = times[previousIndex];
    const t1 = times[nextIndex];
    const ratio = (time - t0) / (t1 - t0);
    if (channel.interpolation === "CUBICSPLINE") {
        return cubicSplineAnimationValue(channel, previousIndex, nextIndex, ratio, t1 - t0);
    }
    if (channel.targetPath === "rotation") {
        return normalizeQuaternion(slerp(animationOutputValue(channel, previousIndex), animationOutputValue(channel, nextIndex), ratio));
    }
    return interpolateArray(animationOutputValue(channel, previousIndex), animationOutputValue(channel, nextIndex), ratio);
}

function createRuntimeAnimationChannels(animation: any, gltf: any): RuntimeAnimationChannel[] {
    return (animation.channels ?? []).flatMap((channel: any) => {
        const sampler = animation.samplers?.[channel.sampler];
        const target = channel.target;
        if (sampler === undefined || target?.node === undefined || target?.path === undefined) {
            return [];
        }
        const input = readAccessorComponents(gltf, sampler.input).map((value) => Number(value[0]));
        const output = readAccessorComponents(gltf, sampler.output);
        if (input.length === 0 || output.length === 0) {
            return [];
        }
        return [{
            targetNode: target.node,
            targetPath: target.path,
            interpolation: sampler.interpolation ?? "LINEAR",
            input,
            output,
        }];
    });
}

function animationOutputValue(channel: RuntimeAnimationChannel, keyframeIndex: number): number[] {
    if (channel.interpolation === "CUBICSPLINE") {
        return [...channel.output[keyframeIndex * 3 + 1]];
    }
    return [...channel.output[keyframeIndex]];
}

function cubicSplineAnimationValue(channel: RuntimeAnimationChannel, previousIndex: number, nextIndex: number, ratio: number, duration: number): number[] {
    const previousValue = channel.output[previousIndex * 3 + 1];
    const previousOutTangent = channel.output[previousIndex * 3 + 2];
    const nextInTangent = channel.output[nextIndex * 3];
    const nextValue = channel.output[nextIndex * 3 + 1];
    const t2 = ratio * ratio;
    const t3 = t2 * ratio;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + ratio;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const value = previousValue.map((_component, index) => (
        h00 * previousValue[index]
        + h10 * duration * previousOutTangent[index]
        + h01 * nextValue[index]
        + h11 * duration * nextInTangent[index]
    ));
    return channel.targetPath === "rotation" ? normalizeQuaternion(value) : value;
}

function interpolateArray(a: number[], b: number[], ratio: number): number[] {
    return a.map((value, index) => value + (b[index] - value) * ratio);
}

function slerp(a: number[], b: number[], ratio: number): number[] {
    let bx = b[0];
    let by = b[1];
    let bz = b[2];
    let bw = b[3];
    let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
    if (cos < 0) {
        cos = -cos;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }
    if (cos > 0.9995) {
        return interpolateArray(a, [bx, by, bz, bw], ratio);
    }
    const theta = Math.acos(Math.min(1, Math.max(-1, cos)));
    const sinTheta = Math.sin(theta);
    const scaleA = Math.sin((1 - ratio) * theta) / sinTheta;
    const scaleB = Math.sin(ratio * theta) / sinTheta;
    return [
        a[0] * scaleA + bx * scaleB,
        a[1] * scaleA + by * scaleB,
        a[2] * scaleA + bz * scaleB,
        a[3] * scaleA + bw * scaleB,
    ];
}

function normalizeQuaternion(value: number[]): number[] {
    const length = Math.hypot(value[0], value[1], value[2], value[3]);
    if (length === 0 || !Number.isFinite(length)) {
        return [0, 0, 0, 1];
    }
    return value.map((component) => component / length);
}

function cloneValue<T>(value: T): T {
    if (value === undefined) {
        return value;
    }
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(cloneValue) as T;
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue(child)])) as T;
}
