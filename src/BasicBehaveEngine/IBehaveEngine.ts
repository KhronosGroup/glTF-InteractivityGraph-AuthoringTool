import {BehaveEngineNode, IFlow, IValue} from "./BehaveEngineNode";

/**
 * Interface representing the Behave Engine, which provides methods for interacting with a behavioral graph engine.
 */
export interface IBehaveEngine {
    /**
     * Callback function to process the start of a Behave Engine node.
     * @param node - The Behave Engine node that has started.
     */
    processNodeStarted: (node: BehaveEngineNode) => void;

    /**
     * Callback function to process the addition of a node to the execution queue.
     * @param flow - The flow representing the node being added to the queue.
     */
    processAddingNodeToQueue: (flow: IFlow) => void;

    /**
     * Callback function to process the execution of the next node in the queue.
     * @param flow - The flow representing the node being executed.
     */
    processExecutingNextNode: (flow: IFlow) => void;

    /**
     * Register known pointers to be used within the Behave Engine.
     */
    registerKnownPointers: () => void;

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
        typeName: string
    ) => void;

    /**
     * Register a Behave Engine node type along with its corresponding class.
     * @param type - The type of the Behave Engine node.
     * @param behaveEngineNode - The class representing the Behave Engine node.
     */
    registerBehaveEngineNode: (type: string, behaveEngineNode: typeof BehaveEngineNode) => void;

    /**
     * Animate a property over time using specified values.
     * @param type - The type of animation.
     * @param path - The property path to be animated.
     * @param easingType - The easing type for the animation.
     * @param easingDuration - The duration of the animation.
     * @param initialValue - The initial value of the property.
     * @param targetValue - The target value of the property after the animation.
     * @param callback - A callback function to be executed after the animation is complete.
     */
    animateProperty: (
        type: string,
        path: string,
        easingType: string,
        easingDuration: number,
        initialValue: any,
        targetValue: any,
        callback: () => void
    ) => void;

    /**
     * Clear all custom event listeners.
     */
    clearCustomEventListeners: () => void;

    /**
     * Add a custom event listener with a specified name and callback function.
     * @param name - The name of the custom event.
     * @param func - The callback function to be executed when the custom event is triggered.
     */
    addCustomEventListener: (name: string, func: any) => void;

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
    emitCustomEvent: (name: string, vals: any) => void;

    /**
     * Set the value of a specified path.
     * @param path - The path to set the value for.
     * @param targetValue - The value to set at the specified path.
     */
    setPathValue: (path: string, targetValue: any) => void;

    getPathValue: (path: string) => any;

    getPathtypeName: (path: string) => any;

    clearValueEvaluationCache: () => void;

    addEntryToValueEvaluationCache: (key: string, val: IValue) => void;

    getValueEvaluationCacheValue: (key: string) => IValue | undefined;
}