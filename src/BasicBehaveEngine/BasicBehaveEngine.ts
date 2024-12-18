import {IBehaveEngine, ICancelable} from "./IBehaveEngine";
import {JsonPtrTrie} from "./JsonPtrTrie";
import {BehaveEngineNode, IBehaviourNodeProps, ICustomEvent, IFlow, IValue, IVariable} from "./BehaveEngineNode";
import {OnStartNode} from "./nodes/lifecycle/onStart";
import {OnTickNode} from "./nodes/lifecycle/onTick";
import {Branch} from "./nodes/flow/Branch";
import {DoN} from "./nodes/flow/DoN";
import {ForLoop} from "./nodes/flow/ForLoop";
import {MultiGate} from "./nodes/flow/MultiGate";
import {Sequence} from "./nodes/flow/Sequence";
import {Switch} from "./nodes/flow/Switch";
import {Throttle} from "./nodes/flow/Throttle";
import {WaitAll} from "./nodes/flow/WaitAll";
import {WhileLoop} from "./nodes/flow/WhileLoop";
import {PointerGet} from "./nodes/pointer/PointerGet";
import {PointerSet} from "./nodes/pointer/PointerSet";
import {PointerAnimateTo} from "./nodes/experimental/PointerAnimateTo";
import {Receive} from "./nodes/customEvent/Receive";
import {Send} from "./nodes/customEvent/Send";
import {VariableGet} from "./nodes/variable/VariableGet";
import {VariableSet} from "./nodes/variable/VariableSet";
import {AbsoluteValue} from "./nodes/math/arithmetic/AbsoluteValue";
import {Euler} from "./nodes/math/constants/Euler";
import {Pi} from "./nodes/math/constants/Pi";
import {Sign} from "./nodes/math/arithmetic/Sign";
import {Truncate} from "./nodes/math/arithmetic/Truncate";
import {Floor} from "./nodes/math/arithmetic/Floor";
import {Ceil} from "./nodes/math/arithmetic/Ceil";
import {Negate} from "./nodes/math/arithmetic/Negate";
import {Add} from "./nodes/math/arithmetic/Add";
import {Subtract} from "./nodes/math/arithmetic/Subtract";
import {Multiply} from "./nodes/math/arithmetic/Multiply";
import {Divide} from "./nodes/math/arithmetic/Divide";
import {Remainder} from "./nodes/math/arithmetic/Remainder";
import {Min} from "./nodes/math/arithmetic/Min";
import {Max} from "./nodes/math/arithmetic/Max";
import {Mix} from "./nodes/math/arithmetic/Mix";
import {Saturate} from "./nodes/math/arithmetic/Saturate";
import {Clamp} from "./nodes/math/arithmetic/Clamp";
import {DegreeToRadians} from "./nodes/math/trigonometry/DegreeToRadians";
import {RadiansToDegrees} from "./nodes/math/trigonometry/RadiansToDegrees";
import {Sine} from "./nodes/math/trigonometry/Sine";
import {Cosine} from "./nodes/math/trigonometry/Cosine";
import {Tangent} from "./nodes/math/trigonometry/Tangent";
import {Arcsine} from "./nodes/math/trigonometry/Arcsine";
import {Arccosine} from "./nodes/math/trigonometry/Arccosine";
import {Arctangent} from "./nodes/math/trigonometry/Arctangent";
import {Arctangent2} from "./nodes/math/trigonometry/Arctangent2";
import {Log} from "./nodes/math/exponential/Log";
import {Log2} from "./nodes/math/exponential/Log2";
import {Log10} from "./nodes/math/exponential/Log10";
import {Power} from "./nodes/math/exponential/Power";
import {SquareRoot} from "./nodes/math/exponential/SquareRoot";
import {CubeRoot} from "./nodes/math/exponential/CubeRoot";
import {Random} from "./nodes/experimental/Random";
import {Dot} from "./nodes/math/vector/Dot";
import {Normalize} from "./nodes/math/vector/Normalize";
import {Rotate2D} from "./nodes/math/vector/Rotate2D";
import {Rotate3D} from "./nodes/math/vector/Rotate3D";
import {VectorLength} from "./nodes/math/vector/VectorLength";
import {IsInfNode} from "./nodes/math/special/IsInfNode";
import {IsNaNNode} from "./nodes/math/special/IsNaNNode";
import {LessThanOrEqualTo} from "./nodes/math/comparison/LessThanOrEqualTo";
import {LessThan} from "./nodes/math/comparison/LessThan";
import {Equality} from "./nodes/math/comparison/Equality";
import {GreaterThanOrEqualTo} from "./nodes/math/comparison/GreaterThanOrEqualTo";
import {GreaterThan} from "./nodes/math/comparison/GreaterThan";
import {Inf} from "./nodes/math/constants/Inf";
import {OutputConsole} from "./nodes/experimental/OutputConsole";
import {SetDelay} from "./nodes/flow/SetDelay";
import {CancelDelay} from "./nodes/flow/CancelDelay";
import {NotANumber} from "./nodes/math/constants/NotANumber";
import {Select} from "./nodes/math/special/Select";
import {BoolToInt} from "./nodes/math/typeConversion/BoolToInt";
import {BoolToFloat} from "./nodes/math/typeConversion/BoolToFloat";
import {FloatToBool} from "./nodes/math/typeConversion/FloatToBool";
import {FloatToInt} from "./nodes/math/typeConversion/FloatToInt";
import {IntToBool} from "./nodes/math/typeConversion/IntToBool";
import {IntToFloat} from "./nodes/math/typeConversion/IntToFloat";
import {Extract2} from "./nodes/math/extract/Extract2";
import {Extract3} from "./nodes/math/extract/Extract3";
import {Extract4} from "./nodes/math/extract/Extract4";
import {Extract4x4} from "./nodes/math/extract/Extract4x4";
import {Combine2} from "./nodes/math/combine/Combine2";
import {Combine3} from "./nodes/math/combine/Combine3";
import {Combine4} from "./nodes/math/combine/Combine4";
import {Combine4x4} from "./nodes/math/combine/Combine4x4";
import {PointerInterpolate} from "./nodes/pointer/PointerInterpolate";
import {Not} from "./nodes/math/bitwise/Not";
import {Xor} from "./nodes/math/bitwise/Xor";
import {Or} from "./nodes/math/bitwise/Or";
import {And} from "./nodes/math/bitwise/And";
import {LeftShift} from "./nodes/math/bitwise/LeftShift";
import {RightShift} from "./nodes/math/bitwise/RightShift";
import {CountLeadingZeros} from "./nodes/math/bitwise/CountLeadingZeros";
import {CountOneBits} from "./nodes/math/bitwise/CountOneBits";
import {CountTrailingZeros} from "./nodes/math/bitwise/CountTrailingZeros";

export interface ICustomEventListener {
    type: string,
    callback: any
}

export interface IEventQueueItem {
    behaveNode: BehaveEngineNode,
    inSocketId?: string
}

export class BasicBehaveEngine implements IBehaveEngine {
    protected registry: Map<string, any>;
    protected idToBehaviourNodeMap: Map<number, BehaveEngineNode>;
    private eventQueue: IEventQueueItem[];
    protected onTickNodeIndices: number[];
    private lastTickTime: number;
    private _scheduledDelays: NodeJS.Timeout[];
    protected nodes: any[];
    protected variables: IVariable[];
    protected events: ICustomEvent[];

    //TODO: def for types
    protected types: any[];
    private jsonPtrTrie: JsonPtrTrie;
    private customEventListeners: ICustomEventListener[]
    private _fps: number;
    private valueEvaluationCache: Map<string, IValue>;
    private pathToWorldAnimationCallback: Map<string, ICancelable>;

    constructor(fps: number) {
        this.registry = new Map<string, any>();
        this.idToBehaviourNodeMap = new Map<number, BehaveEngineNode>();
        this.jsonPtrTrie = new JsonPtrTrie();
        this._fps = fps;
        this.valueEvaluationCache = new Map<string, IValue>();
        this.pathToWorldAnimationCallback = new Map<string, ICancelable>();
        this.onTickNodeIndices = [];
        this.lastTickTime = 0;
        this.eventQueue = [];
        this.variables = [];
        this.events = [];
        this._scheduledDelays = [];
        this.nodes = [];
        this.types = [];
        this.customEventListeners = []

        this.registerKnownBehaviorNodes();
    }

    public get fps() {
        return this._fps;
    }

    public clearScheduledDelays() {
        this._scheduledDelays = [];
    }

    public get scheduledDelays() {
        return this._scheduledDelays;
    }

    public pushScheduledDelay = (delay: NodeJS.Timeout): void => {
        this._scheduledDelays.push(delay);
    }

    public getScheduledDelay = (index: number): NodeJS.Timeout | undefined => {
        if (index >= this._scheduledDelays.length || index < 0) {
            return undefined;
        }

        return this._scheduledDelays[index];
    }

    public clearValueEvaluationCache = (): void => {
        this.valueEvaluationCache.clear();
    }

    public addEntryToValueEvaluationCache = (key: string, val: IValue): void => {
        this.valueEvaluationCache.set(key, val)
    };

    public getValueEvaluationCacheValue = (key: string): IValue | undefined => {
        return this.valueEvaluationCache.get(key);
    }

    public registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string, readOnly: boolean): void => {
        this.jsonPtrTrie.addPath(jsonPtr, getterCallback, setterCallback, typeName, readOnly);
    }

    public isValidJsonPtr = (jsonPtr: string): boolean => {
        return this.jsonPtrTrie.isPathValid(jsonPtr);
    }

    public isReadOnly = (jsonPtr: string): boolean => {
        return this.jsonPtrTrie.isReadOnly(jsonPtr);
    }

    public getPathValue = (path: string) => {
        return this.jsonPtrTrie.getPathValue(path);
    }

    public getPathtypeName = (path: string) => {
        return this.jsonPtrTrie.getPathTypeName(path);
    }

    public setPathValue = (path: string, value: any) => {
        this.jsonPtrTrie.setPathValue(path, value);
    }

    public addCustomEventListener = (name: string, func: any) => {
        document.addEventListener(name, func)
        this.customEventListeners.push({type: name, callback: func})
    }

    public emitCustomEvent = (name: string, vals: any) => {
        const ev = new CustomEvent(name, {detail: vals});
        document.dispatchEvent(ev);
    }

    public clearCustomEventListeners = () => {
        for (const customEventListener of this.customEventListeners) {
            document.removeEventListener(customEventListener.type, customEventListener.callback);
        }
    }

    public loadBehaveGraph = (behaveGraph: any) => {
        try {
            this.validateGraph(behaveGraph);
        } catch (e) {
            throw new Error(`The graph is invalid ${e}`)
        }

        this.nodes = behaveGraph.nodes;
        this.variables = behaveGraph.variables;
        this.events = behaveGraph.events;
        this.types = behaveGraph.types;

        const defaultProps = {
            idToBehaviourNodeMap: this.idToBehaviourNodeMap,
            variables: this.variables,
            events: this.events,
        };

        this.variables.forEach(variable => {
            if (variable.value === undefined) {
                // TODO get the default value from the type
                variable.value = 0;
            }
            // sanitize, these need to be arrays
            if (!Array.isArray(variable.value)) {
                variable.value = [variable.value];
            }
        });

        let index = 0;
        this.nodes.forEach(node => {
            const behaviourNodeProps: IBehaviourNodeProps = {
                ...defaultProps,
                flows:node.flows,
                values: node.values,
                configuration: node.configuration,
                variables: behaveGraph.variables,
                types: behaveGraph.types,
                graphEngine: this,
                addEventToWorkQueue: this.addEventToWorkQueue
            };
            if (this.registry.get(node.type) === undefined) {
                throw Error(`Unrecognized node type ${node.type}`);
            }
            const behaviourNode: BehaveEngineNode = this.registry.get(node.type).init(behaviourNodeProps);
            this.idToBehaviourNodeMap.set(index, behaviourNode);
            index++;
        });

        this.onTickNodeIndices = this.nodes
            .map((node, idx) => node.type === "event/onTick" ? idx : -1)
            .filter(idx => idx !== -1);

        const onTickStartIndices = this.nodes
            .map((node, idx) => node.type === "event/onStart" ? idx : -1)
            .filter(idx => idx !== -1);

        for (const startNodeIndex of onTickStartIndices) {
            if (startNodeIndex !== -1) {
                const startFlow: IFlow = {node: startNodeIndex, id: "start"}
                this.addEventToWorkQueue(startFlow);
            }
        }

        this.executeEventQueue();
    }

    public processNodeStarted = (behaveEngineNode: BehaveEngineNode) => {
        //pass
    }

    public processAddingNodeToQueue = (flowBeingAdded: IFlow) => {
        //pass
    }

    public processExecutingNextNode = (flowBeingExecuted: IFlow) => {
        //pass
    }

    public registerKnownPointers = () => {
        //pass
    }

    public getWorld = (): any => {
        //pass
    }

    public animateProperty = (path: string, easingParameters: any, callback: () => void) => {
        //pass
    }

    public animateCubicBezier = (
        path: string,
        p1: number[],
        p2: number[],
        initialValue: any,
        targetValue: any,
        duration: number,
        valueType: string,
        callback: () => void
    ) => {
        //pass
    }

    private registerKnownBehaviorNodes = () => {
        this.registerBehaveEngineNode("event/onStart", OnStartNode);
        this.registerBehaveEngineNode("event/onTick", OnTickNode);
        this.registerBehaveEngineNode("flow/branch", Branch);
        this.registerBehaveEngineNode("flow/setDelay", SetDelay);
        this.registerBehaveEngineNode("flow/cancelDelay", CancelDelay);
        this.registerBehaveEngineNode("flow/doN", DoN);
        this.registerBehaveEngineNode("flow/for", ForLoop);
        this.registerBehaveEngineNode("flow/multiGate", MultiGate);
        this.registerBehaveEngineNode("flow/sequence", Sequence);
        this.registerBehaveEngineNode("flow/switch", Switch);
        this.registerBehaveEngineNode("flow/throttle", Throttle);
        this.registerBehaveEngineNode("flow/waitAll", WaitAll);
        this.registerBehaveEngineNode("flow/while", WhileLoop);
        this.registerBehaveEngineNode("pointer/get", PointerGet);
        this.registerBehaveEngineNode("pointer/set", PointerSet);
        this.registerBehaveEngineNode("pointer/animateTo", PointerAnimateTo);
        this.registerBehaveEngineNode("pointer/interpolate", PointerInterpolate)
        this.registerBehaveEngineNode("ADBE/output_console_node", OutputConsole);
        this.registerBehaveEngineNode("math/abs", AbsoluteValue);
        this.registerBehaveEngineNode("event/receive", Receive);
        this.registerBehaveEngineNode("event/send", Send);
        this.registerBehaveEngineNode("variable/get", VariableGet);
        this.registerBehaveEngineNode("variable/set", VariableSet);
        this.registerBehaveEngineNode("math/e", Euler);
        this.registerBehaveEngineNode("math/inf", Inf);
        this.registerBehaveEngineNode("math/nan", NotANumber);
        this.registerBehaveEngineNode("math/pi", Pi);
        this.registerBehaveEngineNode("math/sign", Sign);
        this.registerBehaveEngineNode("math/trunc", Truncate);
        this.registerBehaveEngineNode("math/floor", Floor);
        this.registerBehaveEngineNode("math/ceil", Ceil);
        this.registerBehaveEngineNode("math/neg", Negate);
        this.registerBehaveEngineNode("math/add", Add);
        this.registerBehaveEngineNode("math/sub", Subtract);
        this.registerBehaveEngineNode("math/mul", Multiply);
        this.registerBehaveEngineNode("math/div", Divide);
        this.registerBehaveEngineNode("math/rem", Remainder);
        this.registerBehaveEngineNode("math/min", Min);
        this.registerBehaveEngineNode("math/max", Max);
        this.registerBehaveEngineNode("math/mix", Mix);
        this.registerBehaveEngineNode("math/saturate", Saturate);
        this.registerBehaveEngineNode("math/clamp", Clamp);
        this.registerBehaveEngineNode("math/rad", DegreeToRadians);
        this.registerBehaveEngineNode("math/deg", RadiansToDegrees);
        this.registerBehaveEngineNode("math/sin", Sine);
        this.registerBehaveEngineNode("math/cos", Cosine);
        this.registerBehaveEngineNode("math/tan", Tangent);
        this.registerBehaveEngineNode("math/asin", Arcsine);
        this.registerBehaveEngineNode("math/acos", Arccosine);
        this.registerBehaveEngineNode("math/atan", Arctangent);
        this.registerBehaveEngineNode("math/atan2", Arctangent2);
        this.registerBehaveEngineNode("math/log", Log);
        this.registerBehaveEngineNode("math/log2", Log2);
        this.registerBehaveEngineNode("math/log10", Log10);
        this.registerBehaveEngineNode("math/pow", Power);
        this.registerBehaveEngineNode("math/sqrt", SquareRoot);
        this.registerBehaveEngineNode("math/cbrt", CubeRoot);
        this.registerBehaveEngineNode("math/random", Random);
        this.registerBehaveEngineNode("math/lt", LessThan);
        this.registerBehaveEngineNode("math/le", LessThanOrEqualTo);
        this.registerBehaveEngineNode("math/eq", Equality);
        this.registerBehaveEngineNode("math/ge", GreaterThanOrEqualTo);
        this.registerBehaveEngineNode("math/gt", GreaterThan);
        this.registerBehaveEngineNode("math/dot", Dot);
        this.registerBehaveEngineNode("math/normalize", Normalize);
        this.registerBehaveEngineNode("math/rotate2d", Rotate2D);
        this.registerBehaveEngineNode("math/rotate3d", Rotate3D);
        this.registerBehaveEngineNode("math/length", VectorLength);
        this.registerBehaveEngineNode("math/isinf", IsInfNode);
        this.registerBehaveEngineNode("math/isnan", IsNaNNode);
        this.registerBehaveEngineNode("math/select", Select);
        this.registerBehaveEngineNode("math/extract2", Extract2);
        this.registerBehaveEngineNode("math/extract3", Extract3);
        this.registerBehaveEngineNode("math/extract4", Extract4);
        this.registerBehaveEngineNode("math/extract4x4", Extract4x4);
        this.registerBehaveEngineNode("math/combine2", Combine2);
        this.registerBehaveEngineNode("math/combine3", Combine3);
        this.registerBehaveEngineNode("math/combine4", Combine4);
        this.registerBehaveEngineNode("math/combine4x4", Combine4x4);
        this.registerBehaveEngineNode("type/boolToInt", BoolToInt);
        this.registerBehaveEngineNode("type/boolToFloat", BoolToFloat);
        this.registerBehaveEngineNode("type/floatToBool", FloatToBool);
        this.registerBehaveEngineNode("type/floatToInt", FloatToInt);
        this.registerBehaveEngineNode("type/intToBool", IntToBool);
        this.registerBehaveEngineNode("type/intToFloat", IntToFloat);
        this.registerBehaveEngineNode("math/not", Not);
        this.registerBehaveEngineNode("math/xor", Xor);
        this.registerBehaveEngineNode("math/or", Or);
        this.registerBehaveEngineNode("math/and", And);
        this.registerBehaveEngineNode("math/lsl", LeftShift);
        this.registerBehaveEngineNode("math/asr", RightShift);
        this.registerBehaveEngineNode("math/clz", CountLeadingZeros);
        this.registerBehaveEngineNode("math/ctz", CountTrailingZeros);
        this.registerBehaveEngineNode("math/popcnt", CountOneBits);
    }

    protected validateGraph = (behaviorGraph: any) => {
        const nodes: BehaveEngineNode[] = behaviorGraph.nodes;

        let index = 0;
        for (const node of nodes) {
            // for each node, ensure that it's values do not reference a later node
            if (node.values !== undefined) {
                for (const key of Object.keys(node.values)) {
                    if (node.values[key].node !== undefined) {
                        if (Number(node.values[key].node) >= index) {
                            throw Error(`Invalid reference, node ${index} references ${node.values[key].node}`);
                        }
                    }
                }
            }

            index++;
        }
    }

    public registerBehaveEngineNode = (type: string, behaviorNode: typeof BehaveEngineNode) => {
        if (this.registry.has(type)) {
            console.warn(`Behavior node ${type} is already registered and will be overwritten`);
        }
        this.registry.set(type, behaviorNode);
    }

    protected addEventToWorkQueue = (flow: IFlow) => {
        if (flow === undefined || flow.node === undefined) {return}
        const nextNode: BehaveEngineNode | undefined = this.idToBehaviourNodeMap.get(flow.node);

        if (nextNode === undefined) {return}
        const nodeToPush = this.idToBehaviourNodeMap.get(flow.node)!;

        this.processAddingNodeToQueue(flow);
        this.eventQueue.push({behaveNode: nodeToPush, inSocketId: flow.socket});
    }

    private executeEventQueue = () => {
        const eventQueueCopy = [...this.eventQueue];
        this.eventQueue = [];
        while (eventQueueCopy.length > 0) {
            const eventToStart = eventQueueCopy[0];
            eventToStart.behaveNode.processNode(eventToStart.inSocketId);
            eventQueueCopy.splice(0, 1);
        }

        for (const onTickNodeIndex of this.onTickNodeIndices) {
            const tickFlow: IFlow = { node: onTickNodeIndex, id: "tick"}
            const tickNode: BehaveEngineNode = this.idToBehaviourNodeMap.get(tickFlow.node!)!;

            tickNode.processNode()
        }
        
        setTimeout(() => {
            this.executeEventQueue()
        }, 1000 / this.fps)
    }

    getWorldAnimationPathCallback(path: string): ICancelable | undefined {
       return this.pathToWorldAnimationCallback.get(path);
    }

    setWorldAnimationPathCallback(path: string, cancelable: ICancelable | undefined): void {
        if (cancelable === undefined) {
            this.pathToWorldAnimationCallback.delete(path);
        } else {
            this.pathToWorldAnimationCallback.set(path, cancelable)
        }
    }
}
