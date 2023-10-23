import {IBehaveEngine} from "./IBehaveEngine";
import {JsonPtrTrie} from "./JsonPtrTrie";
import {BehaveEngineNode, IBehaviourNodeProps, ICustomEvent, IFlow, IValue, IVariable} from "./BehaveEngineNode";
import {OnStartNode} from "./nodes/lifecycle/onStart";
import {OnTickNode} from "./nodes/lifecycle/onTick";
import {Branch} from "./nodes/flow/Branch";
import {Delay} from "./nodes/flow/Delay";
import {DoN} from "./nodes/flow/DoN";
import {ForLoop} from "./nodes/flow/ForLoop";
import {MultiGate} from "./nodes/flow/MultiGate";
import {Sequence} from "./nodes/flow/Sequence";
import {Switch} from "./nodes/flow/Switch";
import {Throttle} from "./nodes/flow/Throttle";
import {WaitAll} from "./nodes/flow/WaitAll";
import {WhileLoop} from "./nodes/flow/WhileLoop";
import {WorldGet} from "./nodes/world/WorldGet";
import {WorldSet} from "./nodes/world/WorldSet";
import {WorldAnimateTo} from "./nodes/world/WorldAnimateTo";
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
import {LessThan} from "./nodes/experimental/LessThan";
import {Dot} from "./nodes/math/vector/Dot";


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
    protected idToBehaviourNodeMap: Map<string, BehaveEngineNode>;
    private eventQueue: IEventQueueItem[];
    protected onTickNodeIndex: number;
    private lastTickTime: number;
    protected nodes: any[];
    protected variables: IVariable[];
    protected customEvents: ICustomEvent[];

    //TODO: def for types
    protected types: any[];
    private jsonPtrTrie: JsonPtrTrie;
    private customEventListeners: ICustomEventListener[]
    private fps: number;
    private valueEvaluationCache: Map<string, IValue>;

    constructor(fps: number) {
        this.registry = new Map<string, any>();
        this.idToBehaviourNodeMap = new Map<string, BehaveEngineNode>();
        this.jsonPtrTrie = new JsonPtrTrie();
        this.fps = fps;
        this.valueEvaluationCache = new Map<string, IValue>();
        this.onTickNodeIndex = -1;
        this.lastTickTime = 0;
        this.eventQueue = [];
        this.variables = [];
        this.customEvents = [];
        this.nodes = [];
        this.types = [];
        this.customEventListeners = []

        this.registerKnownBehaviorNodes();
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

    public registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string): void => {
        this.jsonPtrTrie.addPath(jsonPtr, getterCallback, setterCallback, typeName);
    }

    public isValidJsonPtr = (jsonPtr: string): boolean => {
        return this.jsonPtrTrie.isPathValid(jsonPtr);
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
        this.customEvents = behaveGraph.customEvents;
        this.types = behaveGraph.types;

        const defaultProps = {
            idToBehaviourNodeMap: this.idToBehaviourNodeMap,
            variables: this.variables,
            customEvents: this.customEvents,
        };

        this.nodes.forEach(node => {
            const behaviourNodeProps: IBehaviourNodeProps = {
                ...defaultProps,
                id: node.id,
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
            this.idToBehaviourNodeMap.set(node.id, behaviourNode);
        });

        //find start node, and start graph
        const startNodeIndex = this.nodes.findIndex(node => node.type === "lifecycle/onStart");
        this.onTickNodeIndex = this.nodes.findIndex(node => node.type === "lifecycle/onTick");
        if (startNodeIndex !== -1) {
            const startFlow: IFlow = {node: this.nodes[startNodeIndex].id, id: "start"}
            this.addEventToWorkQueue(startFlow);
        } else if (this.onTickNodeIndex !== -1) {
            const tickFlow: IFlow = {node: this.nodes[this.onTickNodeIndex].id, id: "tick"}
            this.addEventToWorkQueue(tickFlow)
        }
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

    public animateProperty = (type: string, path: string, easingType: string, easingDuration: number, initialValue: any, targetValue: any, callback: () => void) => {
        //pass
    }

    private registerKnownBehaviorNodes = () => {
        this.registerBehaveEngineNode("lifecycle/onStart", OnStartNode);
        this.registerBehaveEngineNode("lifecycle/onTick", OnTickNode);
        this.registerBehaveEngineNode("flow/branch", Branch);
        this.registerBehaveEngineNode("flow/delay", Delay);
        this.registerBehaveEngineNode("flow/doN", DoN);
        this.registerBehaveEngineNode("flow/forLoop", ForLoop);
        this.registerBehaveEngineNode("flow/multiGate", MultiGate);
        this.registerBehaveEngineNode("flow/sequence", Sequence);
        this.registerBehaveEngineNode("flow/switch", Switch);
        this.registerBehaveEngineNode("flow/throttle", Throttle);
        this.registerBehaveEngineNode("flow/waitAll", WaitAll);
        this.registerBehaveEngineNode("flow/whileLoop", WhileLoop);
        this.registerBehaveEngineNode("world/get", WorldGet);
        this.registerBehaveEngineNode("world/set", WorldSet);
        this.registerBehaveEngineNode("world/animateTo", WorldAnimateTo);
        this.registerBehaveEngineNode("math/abs", AbsoluteValue);
        this.registerBehaveEngineNode("customEvent/receive", Receive);
        this.registerBehaveEngineNode("customEvent/send", Send);
        this.registerBehaveEngineNode("variable/get", VariableGet);
        this.registerBehaveEngineNode("variable/set", VariableSet);
        this.registerBehaveEngineNode("math/e", Euler);
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
        this.registerBehaveEngineNode("math/lessThan", LessThan);
        this.registerBehaveEngineNode("math/dot", Dot);
    }

    protected validateGraph = (behaviorGraph: any) => {
        const nodes: BehaveEngineNode[] = behaviorGraph.nodes;

        for (const node of nodes) {
            // for each node, ensure that it's values do not reference a later node
            if (node.values !== undefined) {
                for (const key of Object.keys(node.values)) {
                    if (node.values[key].node !== undefined) {
                        if (Number(node.values[key].node) >= Number(node.id)) {
                            throw Error(`Invalid reference, node ${node.id} references ${node.values[key].node}`);
                        }
                    }
                }
            }
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
        const nodeToPush = this.idToBehaviourNodeMap.get(nextNode.id)!;

        this.processAddingNodeToQueue(flow);
        this.eventQueue.push({behaveNode: nodeToPush, inSocketId: flow.socket});

        // if only one event in queue, start it
        if (this.eventQueue.length === 1) {
            this.executeNextEvent();
        }
    }

    private executeNextEvent = () => {
        const eventToStart = this.eventQueue[0];
        eventToStart.behaveNode.processNode(eventToStart.inSocketId);

        this.eventQueue.splice(0, 1);
        if (this.eventQueue.length > 0) {
            this.executeNextEvent();
        } else if (this.onTickNodeIndex !== -1) {
            const timeNow = Date.now();
            const timeSinceLastTick = timeNow - this.lastTickTime;
            if (timeSinceLastTick > 1000 / this.fps) {
                const tickFlow: IFlow = {node: this.nodes[this.onTickNodeIndex].id, id: "tick"}
                this.lastTickTime = timeNow;
                this.addEventToWorkQueue(tickFlow)
            } else {
                setTimeout(() => {
                    const tickFlow: IFlow = {node: this.nodes[this.onTickNodeIndex].id, id: "tick"}
                    this.lastTickTime = timeNow;
                    this.addEventToWorkQueue(tickFlow)
                }, 1000 / this.fps - timeSinceLastTick)
            }
        }
    }
}
