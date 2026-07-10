import {IBehaveEngine, IEventQueueItem, IInterpolateAction} from "./IBehaveEngine";
import {BehaveEngineNode} from "./BehaveEngineNode";
import {IInteractivityFlow, IInteractivityValue} from "./types/InteractivityGraph";
import { ApplyImpulse } from "./nodes/rigid_body/ApplyImpulse";
import { ApplyPointImpulse } from "./nodes/rigid_body/ApplyPointImpulse";
import { RayCast } from "./nodes/rigid_body/RayCast";
import { TriggerEntered } from "./nodes/rigid_body/TriggerEntered";
import { TriggerExited } from "./nodes/rigid_body/TriggerExited";

export abstract class ADecorator implements IBehaveEngine {

    behaveEngine: IBehaveEngine;

    constructor(behaveEngine: IBehaveEngine) {
        this.behaveEngine = behaveEngine;
    }

    abstract processNodeStarted: (node: BehaveEngineNode) => void;
    abstract processAddingNodeToQueue: (flow: IInteractivityFlow) => void;
    abstract processExecutingNextNode: (flow: IInteractivityFlow) => void;
    abstract registerKnownPointers: () => void;
    abstract getWorld: () => any;
    abstract getParentNodeIndex: (nodeIndex: number) => number | undefined;
    abstract startAnimation: (animationIndex: number, startTime: number, endTime: number, speed: number, callback: () => void) => void;
    abstract stopAnimation: (animationIndex: number) => void;
    abstract stopAnimationAt: (animationIndex: number, stopTime: number, callback: () => void) => void

    // Shared by every decorator: resolve a "#/..."-style JSON pointer ref down to its trailing id.
    resolveRef = (ref: any): any => {
        if (ref == null || ref === "") {
            return -1;
        }
        return String(ref).split("/").pop();
    }

    registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string, readOnly: boolean) => {
        this.behaveEngine.registerJsonPointer(jsonPtr, getterCallback, setterCallback, typeName, readOnly);
    };

    /**
     * BasicBehaveEngine calls some of its own hooks internally (e.g. `this.getWorld()`,
     * `this.getParentNodeIndex()`) so the decorator's implementation has to be reachable via the
     * wrapped engine's own properties, not just via the decorator instance. Subclasses must call
     * this once, after their own hook fields (getWorld/getParentNodeIndex/startAnimation/
     * stopAnimation/stopAnimationAt) are assigned, to bridge them onto the engine.
     */
    protected bridgeEngineHooks(): void {
        this.behaveEngine.getWorld = this.getWorld;
        this.behaveEngine.getParentNodeIndex = this.getParentNodeIndex;
        this.behaveEngine.startAnimation = this.startAnimation;
        this.behaveEngine.stopAnimation = this.stopAnimation;
        this.behaveEngine.stopAnimationAt = this.stopAnimationAt;
    }

    /** Tears down listeners/observers registered by this decorator. Call before discarding it. */
    dispose(): void {
        this.clearCustomEventListeners();
    }

    registerRigidBodyNodes() {
        this.behaveEngine.registerBehaveEngineNode("rigid_body/applyImpulse", ApplyImpulse);
        this.behaveEngine.registerBehaveEngineNode("rigid_body/applyPointImpulse", ApplyPointImpulse);
        this.behaveEngine.registerBehaveEngineNode("rigid_body/rayCast", RayCast);
        this.behaveEngine.registerBehaveEngineNode("event/rigid_body_triggerEntered", TriggerEntered);
        this.behaveEngine.registerBehaveEngineNode("event/rigid_body_triggerExited", TriggerExited);
    }

    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyImpulseToRigidBody(nodeIndex: number, linearImpulse: [number, number, number], angularImpulse: [number, number, number]): void {
        // Overwrite with application logic here
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyPointImpulseToRigidBody(nodeIndex: number, impulse: [number, number, number], position: [number, number, number]): void {
        // Overwrite with application logic here
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rayCastRigidBodies(rayStart: [number, number, number], rayEnd: [number, number, number], collisionFilterIndex: number): {hitNodeIndex: number, hitFraction: number | undefined, hitNormal: [number, number, number] | undefined} {
        // Overwrite with application logic here
        return { hitNodeIndex: -1, hitFraction: undefined, hitNormal: undefined };
    }

    rigidBodyTriggerEntered(nodeIndex: number, colliderNodeIndex: number, motionNodeIndex: number | undefined) {
        this.behaveEngine.rigidBodyTriggerEntered(nodeIndex, colliderNodeIndex, motionNodeIndex);
    }

    rigidBodyTriggerExited(nodeIndex: number, colliderNodeIndex: number, motionNodeIndex: number | undefined) {
        this.behaveEngine.rigidBodyTriggerExited(nodeIndex, colliderNodeIndex, motionNodeIndex);
    }

    hoverOn(nodeIndex: number | undefined, controllerIndex: number) {
        this.behaveEngine.hoverOn(nodeIndex, controllerIndex);
    }

    select(selectedNodeIndex: number, controllerIndex: number, selectionPoint: [number, number, number] | undefined, selectionRayOrigin: [number, number, number] | undefined) {
        this.behaveEngine.select(selectedNodeIndex, controllerIndex, selectionPoint, selectionRayOrigin);
    }

    getEventList() {
        return this.behaveEngine.getEventList();
    }

    clearEventList() {
        this.behaveEngine.clearEventList();
    }

    addEvent(event: IEventQueueItem) {
        this.behaveEngine.addEvent(event);
    }

    addCustomEventListener(name: string, func: any) {
        this.behaveEngine.addCustomEventListener(name, func);
    }

    clearCustomEventListeners() {
        this.behaveEngine.clearCustomEventListeners();
    }

    registerBehaveEngineNode(type: string, behaveEngineNode: typeof BehaveEngineNode) {
        this.behaveEngine.registerBehaveEngineNode(type, behaveEngineNode);
    }

    getRegisteredJsonPointers(): string[] {
        return this.behaveEngine.getRegisteredJsonPointers();
    }

    isValidJsonPtr(path: string): boolean {
        return this.behaveEngine.isValidJsonPtr(path);
    }

    isReadOnly(path: string): boolean {
        return this.behaveEngine.isReadOnly(path);
    }

    isSlerpPath(path: string): boolean {
        return this.behaveEngine.isSlerpPath(path);
    }

    animateCubicBezier(path: string, p1: number[], p2: number[], initialValue: any, targetValue: any, duration: number, valueType: string, callback: () => void) {
        this.behaveEngine.animateCubicBezier(path, p1, p2, initialValue, targetValue, duration, valueType, callback);
    }

    public get fps(): number {
        return this.behaveEngine.fps;
    }

    loadBehaveGraph(behaveGraph: any, runGraph = true) {
        this.behaveEngine.loadBehaveGraph(behaveGraph, runGraph);
    }

    pauseEventQueue() {
        this.behaveEngine.pauseEventQueue();
    }

    playEventQueue() {
        this.behaveEngine.playEventQueue();
    }

    executeEventQueueTick() {
        this.behaveEngine.executeEventQueueTick();
    }

    dispatchCustomEvent(name: string, vals: any) {
        this.behaveEngine.dispatchCustomEvent(name, vals);
    }

    setPathValue(path: string, targetValue: any) {
        this.behaveEngine.setPathValue(path, targetValue);
    }

    getPathValue(path: string) {
        return this.behaveEngine.getPathValue(path);
    }

    getPathtypeName(path: string) {
        return this.behaveEngine.getPathtypeName(path);
    }

    addEntryToValueEvaluationCache(key: string, val: IInteractivityValue): void {
        this.behaveEngine.addEntryToValueEvaluationCache(key, val);
    }

    clearValueEvaluationCache(): void {
        this.behaveEngine.clearValueEvaluationCache();
    }

    getValueEvaluationCacheValue(key: string): IInteractivityValue | undefined {
        return this.behaveEngine.getValueEvaluationCacheValue(key);
    }

    setPointerInterpolationCallback(path: string, action: IInterpolateAction) {
        this.behaveEngine.setPointerInterpolationCallback(path, action);
    }

    clearPointerInterpolation(path: string) {
        this.behaveEngine.clearPointerInterpolation(path);
    }

    setVariableInterpolationCallback(variable: number, action: IInterpolateAction) {
        this.behaveEngine.setVariableInterpolationCallback(variable, action);
    }

    clearVariableInterpolation(variable: number) {
        this.behaveEngine.clearVariableInterpolation(variable);
    }
}
