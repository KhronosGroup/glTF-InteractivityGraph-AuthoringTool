import {IBehaveEngine, IEventBus, IEventQueueItem, IHoverInformation, IInterpolateAction, IRigidBodyTriggerInformation} from "./IBehaveEngine";
import {JsonPtrTrie} from "./JsonPtrTrie";
import {BehaveEngineNode, IBehaviourNodeProps} from "./BehaveEngineNode";
import {OnStartNode} from "./nodes/event/OnStart";
import {OnTickNode} from "./nodes/event/OnTick";
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
import {Receive} from "./nodes/event/Receive";
import {Send} from "./nodes/event/Send";
import {VariableGet} from "./nodes/variable/VariableGet";
import {VariableSet} from "./nodes/variable/VariableSet";
import {AbsoluteValue} from "./nodes/math/arithmetic/AbsoluteValue";
import {Euler} from "./nodes/math/constants/Euler";
import {Pi} from "./nodes/math/constants/Pi";
import {Tau} from "./nodes/math/constants/Tau";
import {Sign} from "./nodes/math/arithmetic/Sign";
import {Truncate} from "./nodes/math/arithmetic/Truncate";
import {Floor} from "./nodes/math/arithmetic/Floor";
import {Ceil} from "./nodes/math/arithmetic/Ceil";
import {Round} from "./nodes/math/arithmetic/Round";
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
import {Random} from "./nodes/math/Random";
import {Dot} from "./nodes/math/vector/Dot";
import {Cross} from "./nodes/math/vector/Cross";
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
import {Extract2x2} from "./nodes/math/extract/Extract2x2";
import {Extract3x3} from "./nodes/math/extract/Extract3x3";
import {Extract4x4} from "./nodes/math/extract/Extract4x4";
import {Combine2} from "./nodes/math/combine/Combine2";
import {Combine3} from "./nodes/math/combine/Combine3";
import {Combine4} from "./nodes/math/combine/Combine4";
import {Combine2x2} from "./nodes/math/combine/Combine2x2";
import {Combine3x3} from "./nodes/math/combine/Combine3x3";
import {Combine4x4} from "./nodes/math/combine/Combine4x4";
import {PointerInterpolate} from "./nodes/pointer/PointerInterpolate";
import {QuatMul} from "./nodes/math/quaternion/QuatMul";
import {QuatConjugate} from "./nodes/math/quaternion/QuatConjugate";
import {QuatFromAxisAngle} from "./nodes/math/quaternion/QuatFromAxisAngle";
import {QuatToAxisAngle} from "./nodes/math/quaternion/QuatToAxisAngle";
import {QuatFromAngles} from "./nodes/math/quaternion/QuatFromAngles";
import {QuatFromDirections} from "./nodes/math/quaternion/QuatFromDirections";
import {Not} from "./nodes/math/bitwise/Not";
import {Xor} from "./nodes/math/bitwise/Xor";
import {Or} from "./nodes/math/bitwise/Or";
import {And} from "./nodes/math/bitwise/And";
import {LeftShift} from "./nodes/math/bitwise/LeftShift";
import {RightShift} from "./nodes/math/bitwise/RightShift";
import {CountLeadingZeros} from "./nodes/math/bitwise/CountLeadingZeros";
import {CountOneBits} from "./nodes/math/bitwise/CountOneBits";
import {CountTrailingZeros} from "./nodes/math/bitwise/CountTrailingZeros";
import { Fraction } from "./nodes/math/arithmetic/Fraction";
import { HyperbolicSine } from "./nodes/math/hyperbolic/HyperbolicSine";
import { InverseHyperbolicSine } from "./nodes/math/hyperbolic/InverseHyperbolicSine";
import { InverseHyperbolicCosine } from "./nodes/math/hyperbolic/InverseHyperbolicCosine";
import { InverseHyperbolicTangent } from "./nodes/math/hyperbolic/InverseHyperbolicTangent";
import { Exponential } from "./nodes/math/exponential/Exponential";
import { HyperbolicCosine } from "./nodes/math/hyperbolic/HyperbolicCosine";
import { HyperbolicTangent } from "./nodes/math/hyperbolic/HyperbolicTangent";
import { IInteractivityVariable, IInteractivityEvent, IInteractivityValue, IInteractivityFlow, IInteractivityNode, IInteractivityValueType, IInteractivityDeclaration } from "./types/InteractivityGraph";
import { VariableInterpolate } from "./nodes/variable/VariableInterpolate";
import { NoOpNode } from "./nodes/experimental/NoOp";
import { MatDecompose } from "./nodes/math/matrix/matDecompose";
import { MatCompose } from "./nodes/math/matrix/matCompose";
import { MatMul } from "./nodes/math/matrix/MatMul";
import { MathSwitch } from "./nodes/math/special/MathSwitch";
import { Inverse } from "./nodes/math/matrix/Inverse";
import { DebugLog } from "./nodes/debug/Log";
import { QuatAngleBetween } from "./nodes/math/quaternion/QuatAngleBetween";
import { QuatSlerp } from "./nodes/math/quaternion/QuatSlerp";
import { QuatFromUpForward } from "./nodes/math/quaternion/QuatFromUpForward";
import { cubicBezier, linearFloat, slerpFloat4 } from "./easingUtils";
import { Determinant } from "./nodes/math/matrix/Determinant";
import { Transform } from "./nodes/math/vector/Transform";
import { Transpose } from "./nodes/math/matrix/Transpose";
import { RefEquality } from "./nodes/ref/RefEquality";
import { EventStopPropagation } from "./nodes/event/StopPropagation";
import { SmoothStep } from "./nodes/math/arithmetic/SmoothStep";
import { Slerp } from "./nodes/math/vector/Slerp";
import { RgbToOkLCh } from "./nodes/math/color/RgbToOkLCh";
import { RgbFromOkLCh } from "./nodes/math/color/RgbFromOkLCh";
import { OnSelect } from "./nodes/event/OnSelect";
import { AnimationStart } from "./nodes/animation/AnimationStart";
import { AnimationStop } from "./nodes/animation/AnimationStop";
import { AnimationStopAt } from "./nodes/animation/AnimationStopAt";


// Single source of truth for op -> runtime BehaveEngineNode class. registerKnownBehaviorNodes
// iterates this; tools/tests import it to check parity with the authoring palette (tst/opRegistryParity.test.ts).
export const behaveEngineNodeRegistry: ReadonlyArray<[string, any]> = [
    ["event/onStart", OnStartNode],
    ["event/onTick", OnTickNode],
    ["flow/branch", Branch],
    ["flow/setDelay", SetDelay],
    ["flow/cancelDelay", CancelDelay],
    ["flow/doN", DoN],
    ["flow/for", ForLoop],
    ["flow/multiGate", MultiGate],
    ["flow/sequence", Sequence],
    ["flow/switch", Switch],
    ["flow/throttle", Throttle],
    ["flow/waitAll", WaitAll],
    ["flow/while", WhileLoop],
    ["pointer/get", PointerGet],
    ["pointer/set", PointerSet],
    ["pointer/interpolate", PointerInterpolate],
    ["math/abs", AbsoluteValue],
    ["event/receive", Receive],
    ["event/send", Send],
    ["variable/get", VariableGet],
    ["variable/set", VariableSet],
    ["variable/interpolate", VariableInterpolate],
    ["math/E", Euler],
    ["math/Inf", Inf],
    ["math/NaN", NotANumber],
    ["math/Pi", Pi],
    ["math/Tau", Tau],
    ["math/sign", Sign],
    ["math/trunc", Truncate],
    ["math/floor", Floor],
    ["math/fract", Fraction],
    ["math/ceil", Ceil],
    ["math/round", Round],
    ["math/neg", Negate],
    ["math/add", Add],
    ["math/sub", Subtract],
    ["math/mul", Multiply],
    ["math/div", Divide],
    ["math/rem", Remainder],
    ["math/min", Min],
    ["math/max", Max],
    ["math/mix", Mix],
    ["math/saturate", Saturate],
    ["math/clamp", Clamp],
    ["math/smoothStep", SmoothStep],
    ["math/rad", DegreeToRadians],
    ["math/deg", RadiansToDegrees],
    ["math/sin", Sine],
    ["math/cos", Cosine],
    ["math/tan", Tangent],
    ["math/asin", Arcsine],
    ["math/acos", Arccosine],
    ["math/atan", Arctangent],
    ["math/atan2", Arctangent2],
    ["math/sinh", HyperbolicSine],
    ["math/cosh", HyperbolicCosine],
    ["math/tanh", HyperbolicTangent],
    ["math/asinh", InverseHyperbolicSine],
    ["math/acosh", InverseHyperbolicCosine],
    ["math/atanh", InverseHyperbolicTangent],
    ["math/exp", Exponential],
    ["math/log", Log],
    ["math/log2", Log2],
    ["math/log10", Log10],
    ["math/pow", Power],
    ["math/sqrt", SquareRoot],
    ["math/cbrt", CubeRoot],
    ["math/random", Random],
    ["math/lt", LessThan],
    ["math/le", LessThanOrEqualTo],
    ["math/eq", Equality],
    ["math/ge", GreaterThanOrEqualTo],
    ["math/gt", GreaterThan],
    ["math/dot", Dot],
    ["math/cross", Cross],
    ["math/normalize", Normalize],
    ["math/rotate2D", Rotate2D],
    ["math/rotate3D", Rotate3D],
    ["math/length", VectorLength],
    ["math/slerp", Slerp],
    ["math/isInf", IsInfNode],
    ["math/isNaN", IsNaNNode],
    ["math/select", Select],
    ["math/switch", MathSwitch],
    ["math/extract2", Extract2],
    ["math/extract3", Extract3],
    ["math/extract4", Extract4],
    ["math/extract2x2", Extract2x2],
    ["math/extract3x3", Extract3x3],
    ["math/extract4x4", Extract4x4],
    ["math/combine2", Combine2],
    ["math/combine3", Combine3],
    ["math/combine4", Combine4],
    ["math/combine2x2", Combine2x2],
    ["math/combine3x3", Combine3x3],
    ["math/combine4x4", Combine4x4],
    ["type/boolToInt", BoolToInt],
    ["type/boolToFloat", BoolToFloat],
    ["type/floatToBool", FloatToBool],
    ["type/floatToInt", FloatToInt],
    ["type/intToBool", IntToBool],
    ["type/intToFloat", IntToFloat],
    ["math/not", Not],
    ["math/xor", Xor],
    ["math/or", Or],
    ["math/and", And],
    ["math/lsl", LeftShift],
    ["math/asr", RightShift],
    ["math/clz", CountLeadingZeros],
    ["math/ctz", CountTrailingZeros],
    ["math/popcnt", CountOneBits],
    ["math/quatMul", QuatMul],
    ["math/quatConjugate", QuatConjugate],
    ["math/quatFromAxisAngle", QuatFromAxisAngle],
    ["math/quatAngleBetween", QuatAngleBetween],
    ["math/quatSlerp", QuatSlerp],
    ["math/quatToAxisAngle", QuatToAxisAngle],
    ["math/quatFromDirections", QuatFromDirections],
    ["math/quatFromUpForward", QuatFromUpForward],
    ["math/quatFromAngles", QuatFromAngles],
    ["math/matDecompose", MatDecompose],
    ["math/matCompose", MatCompose],
    ["math/determinant", Determinant],
    ["math/transform", Transform],
    ["math/transpose", Transpose],
    ["math/matMul", MatMul],
    ["math/inverse", Inverse],
    ["debug/log", DebugLog],
    ["event/stopPropagation", EventStopPropagation],
    ["ref/eq", RefEquality],
    ["math/rgbToOkLCh", RgbToOkLCh],
    ["math/rgbFromOkLCh", RgbFromOkLCh],
    ["animation/start", AnimationStart],
    ["animation/stop", AnimationStop],
    ["animation/stopAt", AnimationStopAt],
];


export class BasicBehaveEngine implements IBehaveEngine {
    protected registry: Map<string, any>;
    protected idToBehaviourNodeMap: Map<number, BehaveEngineNode>;
    private eventBus: IEventBus;
    protected onTickNodeIndices: number[];
    private _lastTickTime: number;
    private _pauseTickTime: number;
    private _pauseDuration : number;
    private _scheduledDelays: Array<NodeJS.Timeout | undefined>;
    protected nodes: IInteractivityNode[];
    protected _variables: IInteractivityVariable[];
    protected events: IInteractivityEvent[];

    protected types: IInteractivityValueType[];
    private jsonPtrTrie: JsonPtrTrie;
    private _fps: number;
    private valueEvaluationCache: Map<string, IInteractivityValue>;
    private _timerID: NodeJS.Timeout | null;
    public hoverableNodesIndices: Map<number, IHoverInformation>;
    public selectableNodesIndices: Map<number, (selectedNodeRef: any, controllerIndex: number, selectionPoint: [number, number, number] | undefined, selectionRayOrigin: [number, number, number] | undefined) => void>;
    public selectNodes: Array<OnSelect>;
    public lastHoveredNodeIndices: Map<number, number | undefined>;
    public rigidBodyTriggerNodeIndices: Map<number, IRigidBodyTriggerInformation>;
    public propagationCancelled: Set<string>;

    constructor(fps: number, eventBus: IEventBus) {
        this.registry = new Map<string, any>();
        this.idToBehaviourNodeMap = new Map<number, BehaveEngineNode>();
        this.jsonPtrTrie = new JsonPtrTrie();
        this._fps = fps;
        this.valueEvaluationCache = new Map<string, IInteractivityValue>();
        this.onTickNodeIndices = [];
        this._lastTickTime = NaN;
        this._pauseTickTime = NaN;
        this._pauseDuration = 0;
        this.eventBus = eventBus;
        this._variables = [];
        this.events = [];
        this._scheduledDelays = [];
        this.nodes = [];
        this.types = [];
        this._timerID = null;
        this.hoverableNodesIndices = new Map<number, IHoverInformation>();
        this.lastHoveredNodeIndices = new Map<number, number>();
        this.selectableNodesIndices = new Map<number, (selectedNodeRef: any, controllerIndex: number, selectionPoint: [number, number, number] | undefined, selectionRayOrigin: [number, number, number] | undefined) => void>();
        this.selectNodes = [];
        this.rigidBodyTriggerNodeIndices = new Map<number, IRigidBodyTriggerInformation>();
        this.propagationCancelled = new Set<string>();

        this.registerKnownBehaviorNodes();
    }

    public get lastTickTime() {
        return this._lastTickTime - this._pauseDuration;
    }

    public get fps() {
        return this._fps;
    }

    public get variables() {
        return this._variables;
    }

    public startAnimation() {
        // Implemented by decorators
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public stopAnimation(animationIndex: number) {
        // Implemented by decorators
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public stopAnimationAt(animationIndex: number, stopTime: number , callback: () => void) {
        // Implemented by decorators
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public applyImpulseToRigidBody(nodeIndex: number, linearImpulse: [number, number, number], angularImpulse: [number, number, number]) {
        // Implemented by decorators
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public applyPointImpulseToRigidBody(nodeIndex: number, impulse: [number, number, number], position: [number, number, number]) {
        // Implemented by decorators
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public rayCastRigidBodies(rayStart: [number, number, number], rayEnd: [number, number, number], collisionFilterIndex: number): {hitNodeIndex: number, hitFraction: number | undefined, hitNormal: [number, number, number] | undefined} {
        // Implemented by decorators
        return {hitNodeIndex: -1, hitFraction: undefined, hitNormal: undefined};
    }

    public rigidBodyTriggerEntered(nodeIndex: number, colliderNodeIndex: number, motionNodeIndex: number | undefined) {
        const callback = this.rigidBodyTriggerNodeIndices.get(nodeIndex)?.triggerEntered;
        if (callback) {
            callback(colliderNodeIndex, motionNodeIndex);
        }
    }

    public rigidBodyTriggerExited(nodeIndex: number, colliderNodeIndex: number, motionNodeIndex: number | undefined) {
        const callback = this.rigidBodyTriggerNodeIndices.get(nodeIndex)?.triggerExited;
        if (callback) {
            callback(colliderNodeIndex, motionNodeIndex);
        }
    }

    public select(selectedNodeIndex: number, controllerIndex: number, selectionPoint: [number, number, number] | undefined, selectionRayOrigin: [number, number, number] | undefined) {
        for (let nodeIndex = selectedNodeIndex;;) {
            // if (this.propagationCancelled.has("")) {
            //     break;
            // }

            const callback = this.selectableNodesIndices.get(nodeIndex);
            if (callback !== undefined) {
                callback(`/nodes/${selectedNodeIndex}`, controllerIndex, selectionPoint, selectionRayOrigin);
                return;
            }

            const parent = this.getParentNodeIndex(nodeIndex);
            if (parent === undefined) {
                return;
            }
            nodeIndex = parent;
        }
    }

    public hoverOn(nodeIndex: number | undefined, controllerIndex: number) {
        const lastHoverNodeIndex = this.lastHoveredNodeIndices.get(controllerIndex);
        if (nodeIndex === lastHoverNodeIndex) {
            return;
        }
        const oldHoverIndicies = new Set();
        let firstCommonHoverNodeIndex = undefined;
        if (lastHoverNodeIndex !== undefined && nodeIndex !== undefined) {
            let currentOldHoverNodeIndex : number | undefined = lastHoverNodeIndex;
            while (currentOldHoverNodeIndex !== undefined) {
                oldHoverIndicies.add(currentOldHoverNodeIndex);
                currentOldHoverNodeIndex = this.getParentNodeIndex(currentOldHoverNodeIndex);
            }
            let currentHoverNodeIndex : number | undefined = nodeIndex;
            while (currentHoverNodeIndex !== undefined) {
                if (oldHoverIndicies.has(currentHoverNodeIndex)) {
                    firstCommonHoverNodeIndex = currentHoverNodeIndex;
                    break;
                }
                currentHoverNodeIndex = this.getParentNodeIndex(currentHoverNodeIndex);
            }
        }

        this.alertOnHoverOut(nodeIndex, controllerIndex, lastHoverNodeIndex, firstCommonHoverNodeIndex);
        this.alertOnHoverIn(nodeIndex, controllerIndex, nodeIndex,  firstCommonHoverNodeIndex);
        
        this.lastHoveredNodeIndices.set(controllerIndex, nodeIndex);
    }

    public alertOnHoverIn(selectedNodeRef: unknown, controllerIndex: number, currentHoverNodeIndex: number | undefined, firstCommonHoverNodeIndex: number | undefined) {
        while (currentHoverNodeIndex !== undefined && currentHoverNodeIndex !== firstCommonHoverNodeIndex) {
            const hoverInformation = this.hoverableNodesIndices.get(currentHoverNodeIndex);
            if (hoverInformation?.callbackHoverIn !== undefined) {
                hoverInformation.callbackHoverIn(selectedNodeRef, controllerIndex, firstCommonHoverNodeIndex);
                break;
            }
            currentHoverNodeIndex = this.getParentNodeIndex(currentHoverNodeIndex);
        }
    }

    public alertOnHoverOut(selectedNodeRef: unknown, controllerIndex: number, currentHoverNodeIndex: number | undefined, firstCommonHoverNodeIndex: number | undefined) {
        while (currentHoverNodeIndex !== undefined && currentHoverNodeIndex !== firstCommonHoverNodeIndex) {
            const hoverInformation = this.hoverableNodesIndices.get(currentHoverNodeIndex);
            if (hoverInformation?.callbackHoverOut !== undefined) {
                hoverInformation.callbackHoverOut(selectedNodeRef, controllerIndex, firstCommonHoverNodeIndex);
                break;
            }
            currentHoverNodeIndex = this.getParentNodeIndex(currentHoverNodeIndex);
        }
    }

    public clearScheduledDelays() {
        // actually cancel the pending flow/setDelay timers - dropping the references alone leaves
        // them queued, so their callbacks keep firing after the graph is torn down
        for (const delay of this._scheduledDelays) {
            if (delay !== undefined) {
                clearTimeout(delay);
            }
        }
        this._scheduledDelays = [];
    }

    public dispose = () => {
        if (this._timerID !== null) {
            clearTimeout(this._timerID);
            this._timerID = null;
        }
        this.clearScheduledDelays();
        this.clearEventList();
        this.clearCustomEventListeners();
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

    public cancelScheduledDelay = (index: number): void => {
        const delay = this.getScheduledDelay(index);
        if (delay !== undefined) {
            clearTimeout(delay);
            this._scheduledDelays[index] = undefined;
        }
    }

    public removeScheduledDelay = (index: number): void => {
        if (index >= 0 && index < this._scheduledDelays.length) {
            this._scheduledDelays[index] = undefined;
        }
    }

    public getEventList = (): IEventQueueItem[] => {
        return this.eventBus.getEventList();
    }

    public clearEventList = (): void => {
        this.eventBus.clearEventList();
    }

    public addEvent = (event: IEventQueueItem): void => {
        this.eventBus.addEvent(event);
    }

    public clearValueEvaluationCache = (): void => {
        this.valueEvaluationCache.clear();
    }

    public addEntryToValueEvaluationCache = (key: string, val: IInteractivityValue): void => {
        this.valueEvaluationCache.set(key, val)
    };

    public getValueEvaluationCacheValue = (key: string): IInteractivityValue | undefined => {
        return this.valueEvaluationCache.get(key);
    }

    public registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string, readOnly: boolean): void => {
        this.jsonPtrTrie.addPath(jsonPtr, getterCallback, setterCallback, typeName, readOnly);
    }

    public getRegisteredJsonPointers = (): string[] => {
        return this.jsonPtrTrie.getRegisteredPaths();
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

    public getPathTypeName = (path: string) => {
        return this.jsonPtrTrie.getPathTypeName(path);
    }

    public setPathValue = (path: string, value: any) => {
        this.jsonPtrTrie.setPathValue(path, value);
    }

    public addCustomEventListener = (name: string, func: (event: CustomEvent) => void) => {
        this.eventBus.addCustomEventListener(name, func);
    }

    public dispatchCustomEvent = (name: string, vals: any) => {
        this.eventBus.dispatchCustomEvent(name, vals);
    }

    public clearCustomEventListeners = () => {
        this.eventBus.clearCustomEventListeners();
    }

    public queueFunctionCall = (func: () => void): void => {
        this.eventBus.addEvent({func});
    }

    private registerGraphEventPointers = (): void => {
        const eventCountWithLifecycleEvents = (this.events?.length ?? 0) + 2;
        this.registerJsonPointer(
            `/extensions/KHR_interactivity/events/${eventCountWithLifecycleEvents}`,
            (path) => [path],
            () => undefined,
            "ref",
            true
        );
    }

    public loadBehaveGraph = (behaveGraph: any, runGraph = true) => {
        this.hoverableNodesIndices.clear();
        this.selectableNodesIndices.clear();
        this.lastHoveredNodeIndices.clear();
        this.propagationCancelled.clear();
        this._pauseDuration = 0;
        this._pauseTickTime = NaN;
        try {
            this.validateGraph(behaveGraph);
        } catch (e) {
            throw new Error(`The graph is invalid ${e}`)
        }

        this.nodes = behaveGraph.nodes;
        this._variables = behaveGraph.variables;
        this.events = behaveGraph.events;
        this.types = behaveGraph.types;
        this.idToBehaviourNodeMap.clear();
        this.registerGraphEventPointers();

        const defaultProps = {
            idToBehaviourNodeMap: this.idToBehaviourNodeMap,
            variables: this._variables,
            events: this.events,
        };

        this._variables.forEach(variable => {
            if (variable.value === undefined) {
                // TODO get the default value from the type
                variable.value = [0];
            }
            // sanitize, these need to be arrays
            if (!Array.isArray(variable.value)) {
                variable.value = [variable.value];
            }
        });

        let index = 0;
        this.nodes.forEach(node => {
            const nodeDeclaration: IInteractivityDeclaration | undefined = behaveGraph.declarations[node.declaration];
            if (nodeDeclaration === undefined) {
                throw Error(`Unrecognized node declaration ${node.declaration} but declerations has ${Object.keys(behaveGraph.declarations).length} keys`);
            }
            const behaviourNodeProps: IBehaviourNodeProps = {
                ...defaultProps,
                index: index,
                flows:node.flows || {},
                values: node.values || {},
                configuration: node.configuration || {},
                variables: behaveGraph.variables,
                types: behaveGraph.types,
                graphEngine: this,
                declaration: nodeDeclaration,
                addEventToWorkQueue: this.addEventToWorkQueue,
            };
            const nodeType = nodeDeclaration.op;
            let behaviourNode: BehaveEngineNode;
            if (this.registry.get(nodeType) === undefined) {
                behaviourNode = new NoOpNode(behaviourNodeProps);
            } else {
                behaviourNode = this.registry.get(nodeType).init(behaviourNodeProps);
            }
            this.idToBehaviourNodeMap.set(index, behaviourNode);
            index++;
        });

        this.onTickNodeIndices = this.nodes
            .map((node, idx) => behaveGraph.declarations[node.declaration].op === "event/onTick" ? idx : -1)
            .filter(idx => idx !== -1);

        const onStartIndices = this.nodes
            .map((node, idx) => behaveGraph.declarations[node.declaration].op=== "event/onStart" ? idx : -1)
            .filter(idx => idx !== -1);

        for (const startNodeIndex of onStartIndices) {         
            const startFlow: IInteractivityFlow = {node: startNodeIndex, socket: "start"}
            this.addEventToWorkQueue(startFlow);
        }
        if (this._timerID !== null) {
            clearTimeout(this._timerID);
            this._timerID = null;
        }
        if (runGraph) {
            this.executeEventQueue();
        }
    }

    public pauseEventQueue = () => {
        this._pauseTickTime = performance.now();
        if (this._timerID !== null) {
            clearTimeout(this._timerID);
            this._timerID = null;
        }
    }

    public playEventQueue = () => {
        if (this._timerID === null) {
            this.executeEventQueue();
        }
    }

    public processNodeStarted = (behaveEngineNode: BehaveEngineNode) => {
        //pass
    }

    public processAddingNodeToQueue = (flowBeingAdded: IInteractivityFlow) => {
        //pass
    }

    public processExecutingNextNode = (flowBeingExecuted: IInteractivityFlow) => {
        //pass
    }

    public registerKnownPointers = () => {
        //pass
    }

    public getWorld = (): any => {
        //pass
    }

    public getParentNodeIndex = (nodeIndex: number): number | undefined => {
        //pass
        return undefined;
    }

    public isSlerpPath = (path: string): boolean => {
        if (path.endsWith("rotation")) {
            return true;
        } else {
            return false;
        }
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
        this.clearPointerInterpolation(path);
        const startTime = this.lastTickTime;

        const action = async () => {
            const elapsedDuration = (this.lastTickTime - startTime) / 1000;
            const t = Math.min(elapsedDuration / duration, 1);
            const p = cubicBezier(t, {x: 0, y:0}, {x: p1[0], y:p1[1]}, {x: p2[0], y:p2[1]}, {x: 1, y:1});
            if (valueType === "float3") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1]), linearFloat(p.y, initialValue[2], targetValue[2])];
                this.setPathValue(path, value);
            } else if (valueType === "float4") {
                if (this.isSlerpPath(path)) {
                    const value = slerpFloat4(p.y, initialValue, targetValue);
                    this.setPathValue(path, value);
                } else {
                    const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1]), linearFloat(p.y, initialValue[2], targetValue[2]), linearFloat(p.y, initialValue[3], targetValue[3])];
                    this.setPathValue(path, value);
                }
            } else if (valueType === "float") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0])];
                this.setPathValue(path, value);
            } else if (valueType == "float2") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1])];
                this.setPathValue(path, value);
            }

            if (elapsedDuration >= duration) {
                this.setPathValue(path, targetValue);
                this.clearPointerInterpolation(path);
                callback();
            }
        };

        this.setPointerInterpolationCallback(path, {action: action} );
    }

    private registerKnownBehaviorNodes = () => {
        for (const [op, behaveEngineNode] of behaveEngineNodeRegistry) {
            this.registerBehaveEngineNode(op, behaveEngineNode);
        }
    }

    protected validateGraph = (behaviorGraph: any) => {
        const nodes: BehaveEngineNode[] = behaviorGraph.nodes;

        let index = 0;
        for (const node of nodes) {
            // for each node, ensure that it's values do not reference a later node
            if (node.values !== undefined) {
                for (const key of Object.keys(node.values)) {
                    if (node.values[key].node !== undefined) {
                        const referencedNode = Number(node.values[key].node);
                        if (referencedNode >= index) {
                            const opOf = (idx: number) => {
                                const declIdx = (nodes[idx] as any)?.declaration;
                                return behaviorGraph.declarations?.[declIdx]?.op ?? `declaration ${declIdx}`;
                            };
                            throw Error(`Invalid reference: node ${index} ('${opOf(index)}', socket '${key}') references node ${referencedNode} ('${opOf(referencedNode)}'), but a node may only reference nodes that appear earlier in the array (index < ${index}). Reorder the nodes so that node ${referencedNode} comes before node ${index}.`);
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

    protected addEventToWorkQueue = (flow: IInteractivityFlow) => {
        if (flow === undefined || flow.node === undefined) {return}

        const nextNode = this.idToBehaviourNodeMap.get(Number(flow.node));
        if (nextNode === undefined) {return}

        this.processAddingNodeToQueue(flow);
        this.eventBus.addEvent({behaveNode: nextNode, inSocketId: flow.socket});
    }

    public executeEventQueueTick = () => {
        this.executeEventQueue(true);
    };

    private executeEventQueue = (manualStep = false) => {
        // process events in queue
        this._lastTickTime = performance.now();
        if (!isNaN(this._pauseTickTime)) {
            this._pauseDuration += this._lastTickTime - this._pauseTickTime;
            this._pauseTickTime = NaN;
        }

        this.propagationCancelled.clear();
        const eventQueueCopy = [...this.eventBus.getEventList()];
        this.eventBus.clearEventList();
        while (eventQueueCopy.length > 0) {
            const eventToStart = eventQueueCopy[0];
            if (eventToStart.behaveNode) {
                eventToStart.behaveNode.processNode(eventToStart.inSocketId);
            } else if (eventToStart.func) {
                eventToStart.func();
            }
            eventQueueCopy.splice(0, 1);
        }

        // process interpolations
        for (const interpolation of Object.values(this.eventBus.getVariableInterpolationCallbacks())) {
            interpolation.action();
        }
        for (const interpolation of Object.values(this.eventBus.getPointerInterpolationCallbacks())) {
            interpolation.action();
        }

        // process onTick nodes
        for (const onTickNodeIndex of this.onTickNodeIndices) {
            const tickFlow: IInteractivityFlow = { node: onTickNodeIndex, socket: "tick"}
            const tickNode: BehaveEngineNode = this.idToBehaviourNodeMap.get(Number(tickFlow.node))!;

            tickNode.processNode()
        }
        if (this._timerID !== null) {
            clearTimeout(this._timerID);
        }
        if (manualStep) {
            return;
        }
        this._timerID = setTimeout(() => {
            this.executeEventQueue()
        }, 1000 / this.fps)
    }

   

    setPointerInterpolationCallback(path: string, action: IInterpolateAction): void {
        this.eventBus.setPointerInterpolationCallback(path, action);
    }

    setVariableInterpolationCallback(variable: number, action: IInterpolateAction): void {
        this.eventBus.setVariableInterpolationCallback(variable, action);
    }

    clearPointerInterpolation(path: string): void {
        this.eventBus.clearPointerInterpolation(path);
    }

    clearVariableInterpolation(variable: number): void {
        this.eventBus.clearVariableInterpolation(variable);
    }

    isEventPropagationCancelled(event: string): boolean {
        return this.propagationCancelled.has(event);
    }
}
