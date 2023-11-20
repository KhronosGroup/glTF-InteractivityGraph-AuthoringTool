import {IBehaveEngine, ICancelable} from "../IBehaveEngine";
import {BehaveEngineNode, IFlow, IValue} from "../BehaveEngineNode";

export abstract class ADecorator implements IBehaveEngine {
    behaveEngine: IBehaveEngine;

    constructor(behaveEngine: IBehaveEngine) {
        this.behaveEngine = behaveEngine;
    }

    abstract processNodeStarted: (node: BehaveEngineNode) => void;
    abstract processAddingNodeToQueue: (flow: IFlow) => void;
    abstract processExecutingNextNode: (flow: IFlow) => void;
    abstract registerKnownPointers: () => void;
    abstract registerJsonPointer: (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string) => void;
    abstract animateProperty: (type: string, path: string, easingType: number, easingDuration: number, initialValue: any, targetValue: any, callback: () => void) => void;

    addCustomEventListener = (name: string, func: any) => {
        this.behaveEngine.addCustomEventListener(name, func);
    }

    clearCustomEventListeners = () => {
        this.behaveEngine.clearCustomEventListeners();
    }

    registerBehaveEngineNode = (type: string, behaveEngineNode: typeof BehaveEngineNode) => {
        this.behaveEngine.registerBehaveEngineNode(type, behaveEngineNode);
    }

    loadBehaveGraph = (behaveGraph: any) => {
        this.behaveEngine.loadBehaveGraph(behaveGraph);
    }

    emitCustomEvent = (name: string, vals: any) => {
        this.behaveEngine.emitCustomEvent(name, vals);
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

    addEntryToValueEvaluationCache = (key: string, val: IValue): void  => {
        this.behaveEngine.addEntryToValueEvaluationCache(key, val);
    }

    clearValueEvaluationCache = (): void => {
        this.behaveEngine.clearValueEvaluationCache();
    }

    getValueEvaluationCacheValue = (key: string): IValue | undefined => {
        return this.behaveEngine.getValueEvaluationCacheValue(key);
    }

    setWorldAnimationPathCallback = (path: string, cancelable: ICancelable | undefined): void => {
        this.behaveEngine.setWorldAnimationPathCallback(path, cancelable);
    };
    getWorldAnimationPathCallback = (path: string): ICancelable | undefined => {
        return this.behaveEngine.getWorldAnimationPathCallback(path);
    }
}
