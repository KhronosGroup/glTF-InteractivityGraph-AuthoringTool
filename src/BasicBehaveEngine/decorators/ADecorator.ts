import {IBehaveEngine, ICancelable, IEventQueueItem} from "../IBehaveEngine";
import {BehaveEngineNode} from "../BehaveEngineNode";
import {IInteractivityFlow, IInteractivityValue} from "../../types/InteractivityGraph";

export abstract class ADecorator implements IBehaveEngine {

    behaveEngine: IBehaveEngine;

    constructor(behaveEngine: IBehaveEngine) {
        this.behaveEngine = behaveEngine;
    }

    abstract processNodeStarted: (node: BehaveEngineNode) => void;
    abstract processAddingNodeToQueue: (flow: IInteractivityFlow) => void;
    abstract processExecutingNextNode: (flow: IInteractivityFlow) => void;
    abstract registerKnownPointers: () => void;
    abstract registerJsonPointer: (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string, readOnly: boolean) => void;
    abstract animateProperty: (path: string, easingParameters: any, callback: () => void) => void;
    abstract animateCubicBezier: (path: string, p1: number[], p2: number[], initialValue: any, targetValue: any, duration: number, valueType: string, callback: () => void) => void;
    abstract getWorld: () => any;

    getEventList = () => {
        return this.behaveEngine.getEventList();
    }

    clearEventList = () => {
        this.behaveEngine.clearEventList();
    }

    addEvent = (event: IEventQueueItem) => {
        this.behaveEngine.addEvent(event);
    }

    addCustomEventListener = (name: string, func: any) => {
        this.behaveEngine.addCustomEventListener(name, func);
    }

    clearCustomEventListeners = () => {
        this.behaveEngine.clearCustomEventListeners();
    }

    registerBehaveEngineNode = (type: string, behaveEngineNode: typeof BehaveEngineNode) => {
        this.behaveEngine.registerBehaveEngineNode(type, behaveEngineNode);
    }

    public get fps () {
        return 1;
    }
    loadBehaveGraph = (behaveGraph: any) => {
        this.behaveEngine.loadBehaveGraph(behaveGraph);
    }

    dispatchCustomEvent = (name: string, vals: any) => {
        this.behaveEngine.dispatchCustomEvent(name, vals);
    }

    setPathValue = (path: string, targetValue: any) => {
        this.behaveEngine.setPathValue(path, targetValue);
    }

    getPathValue = (path: string) => {
        this.behaveEngine.getPathValue(path);
    }

    getPathtypeName = (path: string) => {
        this.behaveEngine.getPathtypeName(path);
    }

    addEntryToValueEvaluationCache = (key: string, val: IInteractivityValue): void  => {
        this.behaveEngine.addEntryToValueEvaluationCache(key, val);
    }

    clearValueEvaluationCache = (): void => {
        this.behaveEngine.clearValueEvaluationCache();
    }

    getValueEvaluationCacheValue = (key: string): IInteractivityValue | undefined => {
        return this.behaveEngine.getValueEvaluationCacheValue(key);
    }

    setWorldAnimationPathCallback = (path: string, cancelable: ICancelable | undefined): void => {
        this.behaveEngine.setWorldAnimationPathCallback(path, cancelable);
    };
    getWorldAnimationPathCallback = (path: string): ICancelable | undefined => {
        return this.behaveEngine.getWorldAnimationPathCallback(path);
    }
}
