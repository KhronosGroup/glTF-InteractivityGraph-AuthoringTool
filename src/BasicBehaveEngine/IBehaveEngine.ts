import { IInteractivityFlow, IInteractivityValue } from "../types/InteractivityGraph";
import {BehaveEngineNode} from "./BehaveEngineNode";
import {IEasingParameters} from "./easingUtils";

/**
 * Interface representing the Behave Engine, which provides methods for interacting with a behavioral graph engine.
 */
export interface IBehaveEngine {
    get fps():number;
    /**
     * Callback function to process the start of a Behave Engine node.
     * @param node - The Behave Engine node that has started.
     */
    processNodeStarted: (node: BehaveEngineNode) => void;

    /**
     * Callback function to process the addition of a node to the execution queue.
     * @param flow - The flow representing the node being added to the queue.
     */
    processAddingNodeToQueue: (flow: IInteractivityFlow) => void;

    /**
     * Callback function to process the execution of the next node in the queue.
     * @param flow - The flow representing the node being executed.
     */
    processExecutingNextNode: (flow: IInteractivityFlow) => void;

    /**
     * Register known pointers to be used within the Behave Engine.
     */
    registerKnownPointers: () => void;

    isSlerpPath: (path: string) => boolean;

    /**
     * Register a JSON pointer along with callback functions for getting and setting its value.
     * @param jsonPtr - The JSON pointer string.
     * @param getterCallback - A callback function to get the value at the specified JSON pointer path.
     * @param setterCallback - A callback function to set the value at the specified JSON pointer path.
     * @param typeName -  The type located at this pointer
     */
    registerJsonPointer: (
        jsonPtr: string,
        getterCallback: (path: string) => any,
        setterCallback: (path: string, value: any) => void,
        typeName: string,
        readOnly: boolean
    ) => void;

    /**
     * Register a Behave Engine node type along with its corresponding class.
     * @param type - The type of the Behave Engine node.
     * @param behaveEngineNode - The class representing the Behave Engine node.
     */
    registerBehaveEngineNode: (type: string, behaveEngineNode: typeof BehaveEngineNode) => void;

    /**
     * Animate a property over time using specified values.
     * @param path - The property path to be animated.
     * @param easingParameters - Easing type and the easing type specific parameters to preform the easing function
     * @param callback - A callback function to be executed after the animation is complete.
     */
    animateProperty: (
        path: string,
        easingParameters: IEasingParameters<any>,
        callback: () => void
    ) => void;

    /**
     * Animate a property over time using specified values.
     * @param path - The property path to be animated.
     * @param easingParameters - Easing type and the easing type specific parameters to preform the easing function
     * @param callback - A callback function to be executed after the animation is complete.
     */
    animateCubicBezier: (
        path: string,
        p1: number[],
        p2: number[],
        initialValue: any,
        targetValue: any,
        duration: number,
        valueType: string,
        callback: () => void
    ) => void;

    /**
     * Clear all custom event listeners.
     */
    clearCustomEventListeners: () => void;

    /**
     * Add a custom event listener with a specified name and callback function.
     * @param name - The name of the custom event.
     * @param behaveNode - The Behave Engine node that will be triggered when the custom event is triggered.
     */
    addCustomEventListener: (name: string, func: (event: CustomEvent) => void) => void;

    /**
     * Load a Behave graph into the Behave Engine.
     * @param behaveGraph - The Behave graph to be loaded.
     */
    loadBehaveGraph: (behaveGraph: any) => void;

    /**
     * Emit a custom event with a specified name and values.
     * @param name - The name of the custom event to emit.
     * @param params - The values to be passed to the custom event callback functions.
     */
    dispatchCustomEvent: (name: string, vals: Record<string, any>) => void;

    /**
     * Set the value of a specified path.
     * @param path - The path to set the value for.
     * @param targetValue - The value to set at the specified path.
     */
    setPathValue: (path: string, targetValue: any) => void;

    /**
     * Retrieves the value associated with a specific path.
     *
     * @param {string} path - The path to the desired value.
     * @returns {any} The value found at the specified path.
     */
    getPathValue: (path: string) => any;

    /**
     * Retrieves the type name associated with a specific path.
     *
     * @param {string} path - The path to the desired type name.
     * @returns {any} The type name found at the specified path.
     */
    getPathtypeName: (path: string) => any;

    /**
     * Clears the cache used for value evaluations.
     */
    clearValueEvaluationCache: () => void;

    /**
     * Adds an entry to the value evaluation cache.
     *
     * @param {string} key - The cache key for the entry.
     * @param {IValue} val - The value to be cached.
     */
    addEntryToValueEvaluationCache: (key: string, val: IInteractivityValue) => void;

    /**
     * Retrieves the cached value associated with a specific key from the value evaluation cache.
     *
     * @param {string} key - The cache key for the desired value.
     * @returns {IValue | undefined} The cached value or undefined if not found.
     */
    getValueEvaluationCacheValue: (key: string) => IInteractivityValue | undefined;

    setPointerInterpolationCallback: (path: string, action: IInterpolateAction) => void;
    clearPointerInterpolation: (path: string) => void;

    setVariableInterpolationCallback: (variable: number, action: IInterpolateAction) => void;
    clearVariableInterpolation: (variable: number) => void;

    getWorld: () => any;

    getEventList: () => IEventQueueItem[];
    clearEventList: () => void;
    addEvent: (event: IEventQueueItem) => void;
}

export interface IEventQueueItem {
    behaveNode?: BehaveEngineNode,
    func?: () => void,
    inSocketId?: string
}
export interface IEventBus {
    getEventList: () => IEventQueueItem[];
    clearEventList: () => void;
    addEvent: (event: IEventQueueItem) => void;

    addCustomEventListener: (name: string, func: (event: CustomEvent) => void) => void;
    clearCustomEventListeners: () => void;
    dispatchCustomEvent: (name: string, vals: Record<string, any>) => void;
    getCustomEventsNames: () => string[];

    setVariableInterpolationCallback: (variable: number, action: IInterpolateAction) => void;
    getVariableInterpolationCallbacks: () => Record<number, IInterpolateAction>;
    clearVariableInterpolation: (variable: number) => void;

    setPointerInterpolationCallback: (pointer: string, action: IInterpolateAction) => void;
    getPointerInterpolationCallbacks: () => Record<string, IInterpolateAction>;
    clearPointerInterpolation: (pointer: string) => void;
}

export interface IInterpolateAction {
    action: () => void;
}
