import { jest } from '@jest/globals';
import {BasicBehaveEngine} from "../src/BasicBehaveEngine/BasicBehaveEngine";
import {BehaveEngineNode, IBehaviourNodeProps} from '../src/BasicBehaveEngine/BehaveEngineNode';
import {Receive} from "../src/BasicBehaveEngine/nodes/customEvent/Receive";
import {Send} from "../src/BasicBehaveEngine/nodes/customEvent/Send";
import {Branch} from "../src/BasicBehaveEngine/nodes/flow/Branch";
import {Sequence} from "../src/BasicBehaveEngine/nodes/flow/Sequence";
import {ForLoop} from "../src/BasicBehaveEngine/nodes/flow/ForLoop";
import {OnTickNode} from "../src/BasicBehaveEngine/nodes/lifecycle/onTick";
import {DoN} from "../src/BasicBehaveEngine/nodes/flow/DoN";
import {VariableSet} from "../src/BasicBehaveEngine/nodes/variable/VariableSet";
import {PointerSet} from "../src/BasicBehaveEngine/nodes/pointer/PointerSet";
import {OnStartNode} from "../src/BasicBehaveEngine/nodes/lifecycle/onStart";
import {Switch} from "../src/BasicBehaveEngine/nodes/flow/Switch";
import {PointerGet} from "../src/BasicBehaveEngine/nodes/pointer/PointerGet";
import {WhileLoop} from "../src/BasicBehaveEngine/nodes/flow/WhileLoop";
import {WaitAll} from "../src/BasicBehaveEngine/nodes/flow/WaitAll";
import {MultiGate} from "../src/BasicBehaveEngine/nodes/flow/MultiGate";
import {Throttle} from "../src/BasicBehaveEngine/nodes/flow/Throttle";
import {VariableGet} from "../src/BasicBehaveEngine/nodes/variable/VariableGet";
import {Euler} from "../src/BasicBehaveEngine/nodes/math/constants/Euler";
import {Pi} from "../src/BasicBehaveEngine/nodes/math/constants/Pi";
import {AbsoluteValue} from "../src/BasicBehaveEngine/nodes/math/arithmetic/AbsoluteValue";
import {Sign} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Sign";
import {Truncate} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Truncate";
import {Floor} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Floor";
import {Inverse} from "../src/BasicBehaveEngine/nodes/math/matrix/Inverse";
import {Ceil} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Ceil";
import {Add} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Add";
import {Subtract} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Subtract";
import {Multiply} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Multiply";
import {Divide} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Divide";
import {Remainder} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Remainder";
import {Max} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Max";
import {Min} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Min";
import {Mix} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Mix";
import {DegreeToRadians} from "../src/BasicBehaveEngine/nodes/math/trigonometry/DegreeToRadians";
import {RadiansToDegrees} from "../src/BasicBehaveEngine/nodes/math/trigonometry/RadiansToDegrees";
import {Sine} from "../src/BasicBehaveEngine/nodes/math/trigonometry/Sine";
import {Cosine} from "../src/BasicBehaveEngine/nodes/math/trigonometry/Cosine";
import {Tangent} from "../src/BasicBehaveEngine/nodes/math/trigonometry/Tangent";
import {Arcsine} from "../src/BasicBehaveEngine/nodes/math/trigonometry/Arcsine";
import {Arccosine} from "../src/BasicBehaveEngine/nodes/math/trigonometry/Arccosine";
import {Arctangent} from "../src/BasicBehaveEngine/nodes/math/trigonometry/Arctangent";
import {Arctangent2} from "../src/BasicBehaveEngine/nodes/math/trigonometry/Arctangent2";
import {Log} from "../src/BasicBehaveEngine/nodes/math/exponential/Log";
import {Log2} from "../src/BasicBehaveEngine/nodes/math/exponential/Log2";
import {Log10} from "../src/BasicBehaveEngine/nodes/math/exponential/Log10";
import {CubeRoot} from "../src/BasicBehaveEngine/nodes/math/exponential/CubeRoot";
import {SquareRoot} from "../src/BasicBehaveEngine/nodes/math/exponential/SquareRoot";
import {Power} from "../src/BasicBehaveEngine/nodes/math/exponential/Power";
import {standardTypes} from "../src/types/nodes";
import {Clamp} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Clamp";
import {Saturate} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Saturate";
import {Negate} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Negate";
import {Fraction} from "../src/BasicBehaveEngine/nodes/math/arithmetic/Fraction";
import {Exponential} from "../src/BasicBehaveEngine/nodes/math/exponential/Exponential";
import {HyperbolicCosine} from "../src/BasicBehaveEngine/nodes/math/hyperbolic/HyperbolicCosine";
import {HyperbolicSine} from "../src/BasicBehaveEngine/nodes/math/hyperbolic/HyperbolicSine";
import {HyperbolicTangent} from "../src/BasicBehaveEngine/nodes/math/hyperbolic/HyperbolicTangent";
import {InverseHyperbolicCosine} from "../src/BasicBehaveEngine/nodes/math/hyperbolic/InverseHyperbolicCosine";
import {InverseHyperbolicSine} from "../src/BasicBehaveEngine/nodes/math/hyperbolic/InverseHyperbolicSine";
import {InverseHyperbolicTangent} from "../src/BasicBehaveEngine/nodes/math/hyperbolic/InverseHyperbolicTangent";
import {Normalize} from "../src/BasicBehaveEngine/nodes/math/vector/Normalize";
import {VectorLength} from "../src/BasicBehaveEngine/nodes/math/vector/VectorLength";
import {Dot} from "../src/BasicBehaveEngine/nodes/math/vector/Dot";
import {Cross} from "../src/BasicBehaveEngine/nodes/math/vector/Cross";
import {Rotate3D} from "../src/BasicBehaveEngine/nodes/math/vector/Rotate3D";
import {Rotate2D} from "../src/BasicBehaveEngine/nodes/math/vector/Rotate2D";
import {IsInfNode} from "../src/BasicBehaveEngine/nodes/math/special/IsInfNode";
import {IsNaNNode} from "../src/BasicBehaveEngine/nodes/math/special/IsNaNNode";
import {Equality} from "../src/BasicBehaveEngine/nodes/math/comparison/Equality";
import {LessThan} from "../src/BasicBehaveEngine/nodes/math/comparison/LessThan";
import {LessThanOrEqualTo} from "../src/BasicBehaveEngine/nodes/math/comparison/LessThanOrEqualTo";
import {GreaterThan} from "../src/BasicBehaveEngine/nodes/math/comparison/GreaterThan";
import {GreaterThanOrEqualTo} from "../src/BasicBehaveEngine/nodes/math/comparison/GreaterThanOrEqualTo";
import {Inf} from "../src/BasicBehaveEngine/nodes/math/constants/Inf";
import {Transform} from "../src/BasicBehaveEngine/nodes/math/vector/Transform";
import {Transpose} from "../src/BasicBehaveEngine/nodes/math/matrix/Transpose";
import {Determinant} from "../src/BasicBehaveEngine/nodes/math/matrix/Determinant";
import {MatMul} from "../src/BasicBehaveEngine/nodes/math/matrix/MatMul";
import {Not} from "../src/BasicBehaveEngine/nodes/math/bitwise/Not";
import {And} from "../src/BasicBehaveEngine/nodes/math/bitwise/And";
import {Or} from "../src/BasicBehaveEngine/nodes/math/bitwise/Or";
import {Xor} from "../src/BasicBehaveEngine/nodes/math/bitwise/Xor";
import {RightShift} from "../src/BasicBehaveEngine/nodes/math/bitwise/RightShift";
import {LeftShift} from "../src/BasicBehaveEngine/nodes/math/bitwise/LeftShift";
import {CountLeadingZeros} from "../src/BasicBehaveEngine/nodes/math/bitwise/CountLeadingZeros";
import {CountTrailingZeros} from "../src/BasicBehaveEngine/nodes/math/bitwise/CountTrailingZeros";
import {CountOneBits} from "../src/BasicBehaveEngine/nodes/math/bitwise/CountOneBits";
import {SetDelay} from "../src/BasicBehaveEngine/nodes/flow/SetDelay";
import {CancelDelay} from "../src/BasicBehaveEngine/nodes/flow/CancelDelay";
import {NotANumber} from "../src/BasicBehaveEngine/nodes/math/constants/NotANumber";
import {Select} from "../src/BasicBehaveEngine/nodes/math/special/Select";
import {BoolToInt} from "../src/BasicBehaveEngine/nodes/math/typeConversion/BoolToInt";
import {BoolToFloat} from "../src/BasicBehaveEngine/nodes/math/typeConversion/BoolToFloat";
import {FloatToBool} from "../src/BasicBehaveEngine/nodes/math/typeConversion/FloatToBool";
import {FloatToInt} from "../src/BasicBehaveEngine/nodes/math/typeConversion/FloatToInt";
import {IntToBool} from "../src/BasicBehaveEngine/nodes/math/typeConversion/IntToBool";
import {IntToFloat} from "../src/BasicBehaveEngine/nodes/math/typeConversion/IntToFloat";
import {Combine2} from "../src/BasicBehaveEngine/nodes/math/combine/Combine2";
import {Combine3} from "../src/BasicBehaveEngine/nodes/math/combine/Combine3";
import {Combine4} from "../src/BasicBehaveEngine/nodes/math/combine/Combine4";
import {Combine4x4} from "../src/BasicBehaveEngine/nodes/math/combine/Combine4x4";
import {Extract2} from "../src/BasicBehaveEngine/nodes/math/extract/Extract2";
import {Extract3} from "../src/BasicBehaveEngine/nodes/math/extract/Extract3";
import {Extract4} from "../src/BasicBehaveEngine/nodes/math/extract/Extract4";
import {Extract4x4} from "../src/BasicBehaveEngine/nodes/math/extract/Extract4x4";
import {PointerInterpolate} from "../src/BasicBehaveEngine/nodes/pointer/PointerInterpolate";
import { IInteractivityFlow, IInteractivityVariable } from '../src/types/InteractivityGraph';


describe('nodes', () => {
    let executionLog: string;
    let graphEngine: BasicBehaveEngine;
    let world: any;
    let defaultProps: IBehaviourNodeProps;

    beforeAll(() => {
        executionLog = "";
        world = {};
        graphEngine = new BasicBehaveEngine(1);

        defaultProps = {
            declaration: {
                op: "NoOp",
                inputValueSockets: {},
                outputValueSockets: {},
            },
            idToBehaviourNodeMap: new Map<number, BehaveEngineNode>(),
            graphEngine: graphEngine,
            variables: [],
            events: [],
            types: standardTypes,
            flows: {},
            values: {},
            configuration: {},
            addEventToWorkQueue: jest.fn,
        };
    })

    it('event/receive', async () => {
        const receive: Receive = new Receive({
            ...defaultProps,
            configuration: {event: { value: [0] }},
            events: [{ id: 'testCustomEvent', values: {text: { type: 7 }} }],
            flows: {out: { }},
        });
        await new Promise((resolve) => setTimeout(resolve, 500));

        graphEngine.emitCustomEvent('KHR_INTERACTIVITY:testCustomEvent', { text: 'test' });
        //wait for graph to emit
        await new Promise((resolve) => setTimeout(resolve, 1000));
        expect(receive.outValues.text.value).toStrictEqual(['test']);
    }, 3000);

    it('event/send', async () => {
        const send: Send = new Send({
            ...defaultProps,
            configuration: {event: { value: [0] }},
            events: [{ id: 'testCustomEvent', values: {text: { type: 7 }} }],
            values: {text: { value: ['test'], type: 7}},
        });

        // Replace the original function with the mock
        const argCapture = jest.fn();
        document.dispatchEvent = jest.fn<(event: Event) => boolean>().mockImplementation((event) => {
            argCapture(event.type as any);
            return true;
        });

        await send.processNode();
        expect(argCapture).toHaveBeenCalledWith('KHR_INTERACTIVITY:testCustomEvent');
    });

    it('flow/branch', async () => {
        const trueBranch: Branch = new Branch({
            ...defaultProps,
            values: {condition: { value: [true], type: 0 }},
            flows: {true: { node: 0, socket: 'in' }, false: { node: 1, socket: 'in' }},
        });

        trueBranch.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await trueBranch.processNode();
        expect(trueBranch.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 0 });

        const falseBranch: Branch = new Branch({
            ...defaultProps,
            values: {condition: { value: [false], type: 0 }},
            flows: {true: { node: 0, socket: 'in' }, false: { node: 1, socket: 'in' }},
        });

        falseBranch.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await falseBranch.processNode();
        expect(falseBranch.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 1 });
    });

    it('flow/setDelay', async () => {
        graphEngine.clearScheduledDelays();
        const setDelay: SetDelay = new SetDelay({
            ...defaultProps,
            values: {duration: { value: [0.5], type: 2 }},
            flows: {out: { node: 1, socket: 'in' }, done: { node: 2, socket: 'in' }}
        });
        setDelay.addEventToWorkQueue = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        setDelay.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        setDelay.processNode('in');
        setDelay.processNode('cancel');
        expect(setDelay.outValues.lastDelayIndex.value![0]).toBe(-1);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(setDelay.addEventToWorkQueue).not.toHaveBeenCalled()
        expect(setDelay.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 1 });

        setDelay.processNode('in');
        expect(setDelay.outValues.lastDelayIndex.value![0]).toBe(1);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(setDelay.addEventToWorkQueue).toHaveBeenCalledWith({ socket: 'in', node: 2 });
        expect(setDelay.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 1 });
    });

    it('flow/cancelDelay', async () => {
        graphEngine.clearScheduledDelays();
        const cancelDelay: CancelDelay = new CancelDelay({
            ...defaultProps,
            values: {delayIndex: { value: [0], type: 1 }},
            flows: {out: { node: 1, socket: 'in' }}
        });
        cancelDelay.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        cancelDelay.processNode("in");

        const setDelay: SetDelay = new SetDelay({
            ...defaultProps,
            values: {duration: { value: [0.5], type: 2 }},
            flows: {out: { node: 1, socket: 'in' }, done: { node: 2, socket: 'in' }}
        });
        setDelay.addEventToWorkQueue = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        setDelay.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        setDelay.processNode('in');
        cancelDelay.processNode("in");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(cancelDelay.processFlow).toHaveBeenCalledWith({socket: "in", node: 1});
        expect(setDelay.addEventToWorkQueue).not.toHaveBeenCalled();
        expect(setDelay.processFlow).toHaveBeenCalledWith({socket: "in", node: 1});
    });

    it('flow/sequence', async () => {
        const sequence: Sequence = new Sequence({
            ...defaultProps,
            flows: {0: { node: 0, socket: 'in' }, 1: { node: 1, socket: 'in' }, 2: { node: 2, socket: 'in' }},
        });

        sequence.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await sequence.processNode();

        expect(sequence.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 0 });
        expect(sequence.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 1 });
        expect(sequence.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 2 });
    });

    it('flow/for', async () => {
        const forLoop: ForLoop = new ForLoop({
            ...defaultProps,
            configuration: {initialIndex: { value: [0] }},
            values: {startIndex: { value: [0], type: 1 }, endIndex: { value: [5], type: 1 }},
            flows: {loopBody: { node: 0, socket: 'in' }, completed: { node: 1, socket: 'in' }},
        });

        forLoop.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await forLoop.processNode();

        expect(forLoop.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 0 });
        expect(forLoop.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 1 });
        expect(forLoop.processFlow).toHaveBeenCalledTimes(6);
    });

    it('flow/doN', async () => {
        const doN: DoN = new DoN({
            ...defaultProps,
            values: {n: { value: [2], type: 1}},
            flows: {out: { node: 0, socket: 'in' }},
        });

        doN.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        expect(doN.outValues.currentCount.value![0]).toBe(0);
        doN.processNode("in");
        expect(doN.outValues.currentCount.value![0]).toBe(1);
        doN.processNode("in");
        expect(doN.outValues.currentCount.value![0]).toBe(2);
        doN.processNode("in");
        expect(doN.outValues.currentCount.value![0]).toBe(2);

        expect(doN.processFlow).toHaveBeenCalledTimes(2);

        doN.processNode("reset");
        expect(doN.outValues.currentCount.value![0]).toBe(0);
        doN.processNode("in");
        expect(doN.processFlow).toHaveBeenCalledTimes(3);
    });

    it('flow/multiGate', async () => {
        const multiGate: MultiGate = new MultiGate({
            ...defaultProps,
            configuration: {isRandom: { value: [false] }, loop: { value: [false] }},
            flows: {0: { node: 0, socket: 'in' }, 1: { node: 1, socket: 'in' }, 2: { node: 2, socket: 'in' }},
        });

        multiGate.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await multiGate.processNode('in');
        await multiGate.processNode('in');
        await multiGate.processNode('in');
        await multiGate.processNode('in');

        expect(multiGate.processFlow).toHaveBeenCalledTimes(3);
    });

    it('flow/switch', async () => {
        const switchNode: Switch = new Switch({
            ...defaultProps,
            configuration: {cases: { value: [0, 1, 2] }},
            values: {selection: { value: [1], type: 1 }},
            flows: {0: { node: 0, socket: 'in' }, 1: { node: 1, socket: 'in' }, 2: { node: 2, socket: 'in' }},
        });

        switchNode.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await switchNode.processNode('in');

        expect(switchNode.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 1 });

        const defaultSwitchNode: Switch = new Switch({
            ...defaultProps,
            configuration: {cases: { value: [0, 1, 2] }},
            values: {selection: { value: [4], type: 1 }},
            flows: {0: { node: 0, socket: 'in' }, 1: { node: 1, socket: 'in' }, 2: { node: 2, socket: 'in' }, default: { node: 4, socket: 'in' }},
        });

        defaultSwitchNode.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await defaultSwitchNode.processNode('in');

        expect(defaultSwitchNode.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 4 });
    });

    it('flow/throttle', async () => {
        const throttleNode: Throttle = new Throttle({
            ...defaultProps,
            values: {duration: { value: [1], type: 2 }},
            flows: {out: { node: 0, socket: 'in' }},
        });

        throttleNode.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        expect(throttleNode.outValues.lastRemainingTime.value![0]).toBe(NaN);
        throttleNode.processNode('in');
        expect(throttleNode.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 0 });
        await new Promise((resolve) => setTimeout(resolve, 100));
        throttleNode.processNode('in');
        expect(throttleNode.outValues.lastRemainingTime.value![0]).not.toBe(NaN);
        expect(throttleNode.outValues.lastRemainingTime.value![0]).toBeGreaterThan(0);

        //clear throttle limit
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await throttleNode.processNode('in');
        expect(throttleNode.outValues.lastRemainingTime.value![0]).toBe(0);
    });

    it('flow/waitAll', async () => {
        const waitAll: WaitAll = new WaitAll({
            ...defaultProps,
            configuration: {inputFlows: { value: [2] }},
            flows: {out: { node: 1, socket: 'in' }, completed: { node: 2, socket: 'in' }},
        });

        waitAll.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        waitAll.processNode('0');
        expect(waitAll.outValues.remainingInputs.value![0]).toBe(1)
        waitAll.processNode('reset');
        expect(waitAll.outValues.remainingInputs.value![0]).toBe(2);
        waitAll.processNode('1');
        expect(waitAll.processFlow).toHaveBeenCalledTimes(2);
        expect(waitAll.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 1 });

        waitAll.processNode('0');
        expect(waitAll.outValues.remainingInputs.value![0]).toBe(0);
        expect(waitAll.processFlow).toHaveBeenCalledTimes(3);
        expect(waitAll.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 2 });
    });

    it('flow/while', async () => {
        const whileLoop: WhileLoop = new WhileLoop({
            ...defaultProps,
            values: {condition: { value: [false], type: 0 }},
            flows: {loopBody: { node: 0, socket: 'in' }, completed: { node: 1, socket: 'in' }},
        });

        whileLoop.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await whileLoop.processNode();

        expect(whileLoop.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 1 });
        expect(whileLoop.processFlow).toHaveBeenCalledTimes(1);
    });

    it('variable/get', async () => {
        const variableGet: VariableGet = new VariableGet({
            ...defaultProps,
            configuration: {variable: { value: [0] }},
            variables: [{ value: [42], type: 1 }],
        });

        const res = await variableGet.processNode()['value'];
        expect(res!.value![0]).toBe(42);
    });

    it('variable/set', async () => {
        const variables: IInteractivityVariable[] = [{ value: [42], type: 1 }];
        const variableSet: VariableSet = new VariableSet({
            ...defaultProps,
            configuration: {variable: { value: [0] }},
            variables: variables,
            values: {value: { value: [10], type: 1 }},
        });

        await variableSet.processNode('in');
        expect(variables[0].value![0]).toBe(10);
    });

    it('pointer/get', async () => {
        const world = {nodes:[{ value: 1 }, { value: 2 }]};
        const pointerGet: PointerGet = new PointerGet({
            ...defaultProps,
            configuration: {pointer: { value: ['/nodes/{index}/value'] }, type: { value: [1] }},
            values: {index: { value: [1], type: 1 }},
        });
        graphEngine.registerJsonPointer(
            '/nodes/99/value',
            (path) => {
                const parts: string[] = path.split('/');
                return [world.nodes[Number(parts[2])].value];
            },
            (path, value) => {
                const parts: string[] = path.split('/');
                world.nodes[Number(parts[2])].value = value;
            },
            "float", false
        );

        const res  = pointerGet.processNode();
        expect(res['value']!.value[0]).toBe(2);

        const pointerGetCustomPtr: PointerGet = new PointerGet({
            ...defaultProps,
            configuration: {pointer: { value: ['/nodes/0/value'] }, type: { value: [1] }},
        });

        const resCustom = await pointerGetCustomPtr.processNode();
        expect(resCustom['value']!.value[0]).toBe(1);
    });

    it('pointer/set', async () => {
        const world = {nodes:[{ value: 1 }, { value: 2 }]};
        graphEngine.registerJsonPointer(
            '/nodes/99/value',
            (path) => {
                const parts: string[] = path.split('/');
                return world.nodes[Number(parts[2])].value;
            },
            (path, value) => {
                const parts: string[] = path.split('/');
               world.nodes[Number(parts[2])].value = value;
            },
            "int", false
        );
        const pointerSet: PointerSet = new PointerSet({
            ...defaultProps,
            configuration: {pointer: { value: ['/nodes/{index}/value'] }, type: { value: [1] }},
            values: {index: { value: [0], type: 1 }, value: { value: [42], type: 1 }},
        });

        await pointerSet.processNode('in');
        const res = world.nodes[0].value;
        expect(res).toBe(42);
    });

    it('pointer/interpolate', async () => {
        const world = {nodes:[{ value: 1 }, { value: 2 }]};
        graphEngine.registerJsonPointer(
            '/nodes/99/value',
            (path) => {
                const parts: string[] = path.split('/');
                return world.nodes[Number(parts[2])].value;
            },
            (path, value) => {
                const parts: string[] = path.split('/');
                world.nodes[Number(parts[2])].value = value;
            },
            "float", false
        );
        const pointerInterpolate: PointerInterpolate = new PointerInterpolate({
            ...defaultProps,
            configuration: {pointer: { value: ['/nodes/{index}/value'] }, type: { value: [2] }},
            values: {index: { value: [0], type: 1 }, duration: { value: [0.5], type: 2}, value: { value: [42], type: 2 }, p1: { value: [0,0], type: 3 }, p2: { value: [1,1], type: 3}},
        });

        graphEngine.animateCubicBezier = jest.fn(() => {
            world.nodes[0].value = 42;
        })
        pointerInterpolate.processNode('in');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        expect(graphEngine.animateCubicBezier).toHaveBeenCalledTimes(1);
        expect(world.nodes[0].value).toBe(42);
    });

    it('lifecycle/onStart', async () => {
        const onStart: OnStartNode = new OnStartNode({
            ...defaultProps,
            flows: {out: { node: 0, socket: 'in' }},
        });

        onStart.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await onStart.processNode('in');
        expect(onStart.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 0 });
    });

    it('lifecycle/onTick', async () => {
        const onTick: OnTickNode = new OnTickNode({
            ...defaultProps,
            flows: {out: { node: 0, socket: 'in' }},
        });

        onTick.processFlow = jest.fn<(flow: IInteractivityFlow) => Promise<void>>();
        await onTick.processNode('in');
        expect(onTick.processFlow).toHaveBeenCalledWith({ socket: 'in', node: 0 });
    });

    it("math/e", () => {
        const euler: Euler = new Euler({
            ...defaultProps
        });

        const val = euler.processNode();
        expect(val['value'].value[0]).toBe(Math.E);
    });

    it("math/Inf", () => {
        const inf: Inf = new Inf({
            ...defaultProps
        });

        const val = inf.processNode();
        expect(val['value'].value[0]).toBe(Infinity);
    });

    it("math/pi", () => {
        const pi: Pi = new Pi({
            ...defaultProps
        });

        const val = pi.processNode();
        expect(val['value'].value[0]).toBe(Math.PI);
    });

    it("math/nan", () => {
        const nan: NotANumber = new NotANumber({
            ...defaultProps
        });

        const val = nan.processNode();
        expect(val['value'].value[0]).toBe(NaN);
    });

    it("math/abs", () => {
        let abs: AbsoluteValue = new AbsoluteValue({
            ...defaultProps,
            values: {a: { value: [-10], type: 1}}
        });

        let val = abs.processNode();
        expect(val['value'].value[0]).toBe(10);

        abs = new AbsoluteValue({
            ...defaultProps,
            values: {a: { value: [-10], type: 2}}
        });

        val = abs.processNode();
        expect(val['value'].value[0]).toBe(10);

        abs = new AbsoluteValue({
            ...defaultProps,
            values: {a: { value: [-10, 12, -20] , type: 4}}
        });

        val = abs.processNode();
        expect(val['value'].value[0]).toBe(10);
        expect(val['value'].value[1]).toBe(12);
        expect(val['value'].value[2]).toBe(20);
    });

    it("math/sign", () => {
        let sign: Sign = new Sign({
            ...defaultProps,
            values: {a: { value: [-10], type: 2}}
        });

        let val = sign.processNode();
        expect(val['value'].value[0]).toBe(-1);

        sign = new Sign({
            ...defaultProps,
            values: {a: { value: [-10, 0, 10] , type: 4}}
        });

        val = sign.processNode();
        expect(val['value'].value[0]).toBe(-1);
        expect(val['value'].value[1]).toBe(0);
        expect(val['value'].value[2]).toBe(1);
    });

    it("math/trunc", () => {
        let trunc: Truncate = new Truncate({
            ...defaultProps,
            values: {a: { value: [-10.1201223], type: 2}}
        });

        let val = trunc.processNode();
        expect(val['value'].value[0]).toBe(-10);

        trunc = new Truncate({
            ...defaultProps,
            values: {a: { value: [-10.123, 0.493, 10.12] , type: 4}}
        });

        val = trunc.processNode();
        expect(val['value'].value[0]).toBe(-10);
        expect(val['value'].value[1]).toBe(0);
        expect(val['value'].value[2]).toBe(10);
    });

    it("math/floor", () => {
        let floor: Floor = new Floor({
            ...defaultProps,
            values: {a: { value: [-10.1201223], type: 2}}
        });

        let val = floor.processNode();
        expect(val['value'].value[0]).toBe(-11);

        floor = new Floor({
            ...defaultProps,
            values: {a: { value: [-10.123, 0.493, 10.12] , type: 4}}
        });

        val = floor.processNode();
        expect(val['value'].value[0]).toBe(-11);
        expect(val['value'].value[1]).toBe(0);
        expect(val['value'].value[2]).toBe(10);
    });

    it("math/ceil", () => {
        let ceil: Ceil = new Ceil({
            ...defaultProps,
            values: {a: { value: [-10.1201223], type: 2}}
        });

        let val = ceil.processNode();
        expect(val['value'].value[0]).toBe(-10);

        ceil = new Ceil({
            ...defaultProps,
            values: {a: { value: [-10.123, 0.493, 10.12] , type: 4}}
        });

        val = ceil.processNode();
        expect(val['value'].value[0]).toBe(-10);
        expect(val['value'].value[1]).toBe(1);
        expect(val['value'].value[2]).toBe(11);
    });

    it("math/add", () => {
        let add: Add = new Add({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = add.processNode();
        expect(val['value'].value[0]).toBe(-5);

        add = new Add({
            ...defaultProps,
            values: {a: { value: [-10.5, 0.5, 9] , type: 4}, b: { value: [4, -6, 10] , type: 4}}
        });

        val = add.processNode();
        expect(val['value'].value[0]).toBe(-6.5);
        expect(val['value'].value[1]).toBe(-5.5);
        expect(val['value'].value[2]).toBe(19);
    });

    it("math/extract2", () => {
        let extract2: Extract2 = new Extract2({
            ...defaultProps,
            values: {a: { value: [-10.5, 5.5], type: 3}}
        });

        let val = extract2.processNode();
        expect(val['0'].value[0]).toBe(-10.5);
        expect(val['1'].value[0]).toBe(5.5);
    });

    it("math/extract3", () => {
        let extract3: Extract3 = new Extract3({
            ...defaultProps,
            values: {a: { value: [-10.5, 5.5, 4], type: 4}}
        });

        let val = extract3.processNode();
        expect(val['0'].value[0]).toBe(-10.5);
        expect(val['1'].value[0]).toBe(5.5);
        expect(val['2'].value[0]).toBe(4);
    });

    it("math/extract4", () => {
        let extract4: Extract4 = new Extract4({
            ...defaultProps,
            values: {a: { value: [-10.5, 5.5, 4, 6], type: 5}}
        });

        let val = extract4.processNode();
        expect(val['0'].value[0]).toBe(-10.5);
        expect(val['1'].value[0]).toBe(5.5);
        expect(val['2'].value[0]).toBe(4);
        expect(val['3'].value[0]).toBe(6);
    });

    it("math/extract4x4", () => {
        let extract4x4: Extract4x4 = new Extract4x4({
            ...defaultProps,
            values: {a: { value: [[-10.5, 5.5, 4, 6], [1,2,3,4], [5,6,7,8], [9, 10, 11, 12]], type: 6}}
        });

        let val = extract4x4.processNode();
        expect(val['0'].value[0]).toBe(-10.5);
        expect(val['1'].value[0]).toBe(5.5);
        expect(val['2'].value[0]).toBe(4);
        expect(val['3'].value[0]).toBe(6);
        expect(val['4'].value[0]).toBe(1);
        expect(val['5'].value[0]).toBe(2);
        expect(val['6'].value[0]).toBe(3);
        expect(val['7'].value[0]).toBe(4);
        expect(val['8'].value[0]).toBe(5);
        expect(val['9'].value[0]).toBe(6);
        expect(val['10'].value[0]).toBe(7);
        expect(val['11'].value[0]).toBe(8);
        expect(val['12'].value[0]).toBe(9);
        expect(val['13'].value[0]).toBe(10);
        expect(val['14'].value[0]).toBe(11);
        expect(val['15'].value[0]).toBe(12);
    });

    it("math/combine2", () => {
        let combine2: Combine2 = new Combine2({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = combine2.processNode();
        expect(val['value'].value[0]).toBe(-10.5);
        expect(val['value'].value[1]).toBe(5.5);
    });

    it("math/combine3", () => {
        let combine3: Combine3 = new Combine3({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}, c: { value: [0.5], type: 2}}
        });

        let val = combine3.processNode();
        expect(val['value'].value[0]).toBe(-10.5);
        expect(val['value'].value[1]).toBe(5.5);
        expect(val['value'].value[2]).toBe(0.5);
    });

    it("math/combine4", () => {
        let combine4: Combine4 = new Combine4({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}, c: { value: [0.5], type: 2}, d: { value: [7.5], type: 2}}
        });

        let val = combine4.processNode();
        expect(val['value'].value[0]).toBe(-10.5);
        expect(val['value'].value[1]).toBe(5.5);
        expect(val['value'].value[2]).toBe(0.5);
        expect(val['value'].value[3]).toBe(7.5);
    });

    it("math/combine4x4", () => {
        let combine4x4: Combine4x4 = new Combine4x4({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}, c: { value: [0.5], type: 2}, d: { value: [7.5], type: 2}, e: { value: [-10], type: 2}, f: { value: [5], type: 2}, g: { value: [0], type: 2}, h: { value: [7], type: 2}, i: { value: [10.5], type: 2}, j: { value: [5.8], type: 2}, k: { value: [9.5], type: 2}, l: { value: [2.5], type: 2}, m: { value: [-1.5], type: 2}, n: { value: [5.7], type: 2}, o: { value: [6.5], type: 2}, p: { value: [7.7], type: 2}}
        });

        let val = combine4x4.processNode();
        expect(val['value'].value[0][0]).toBe(-10.5);
        expect(val['value'].value[0][1]).toBe(5.5);
        expect(val['value'].value[0][2]).toBe(0.5);
        expect(val['value'].value[0][3]).toBe(7.5);
        expect(val['value'].value[1][0]).toBe(-10);
        expect(val['value'].value[1][1]).toBe(5);
        expect(val['value'].value[1][2]).toBe(0);
        expect(val['value'].value[1][3]).toBe(7);
        expect(val['value'].value[2][0]).toBe(10.5);
        expect(val['value'].value[2][1]).toBe(5.8);
        expect(val['value'].value[2][2]).toBe(9.5);
        expect(val['value'].value[2][3]).toBe(2.5);
        expect(val['value'].value[3][0]).toBe(-1.5);
        expect(val['value'].value[3][1]).toBe(5.7);
        expect(val['value'].value[3][2]).toBe(6.5);
        expect(val['value'].value[3][3]).toBe(7.7);
    });

    it("math/inverse", () => {
        let inverse: Inverse = new Inverse({
            ...defaultProps,
            values: {a: { value: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], type: 6}}
        });

        let val = inverse.processNode();
        expect(val['value'].value[0][0]).toBe(1);
        expect(val['value'].value[1][1]).toBe(1);
        expect(val['value'].value[2][2]).toBe(1);
        expect(val['value'].value[3][3]).toBe(1);
    });

    it("math/select", () => {
        let select: Select = new Select({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}, condition: { value: [true], type: 0}}
        });

        let val = select.processNode();
        expect(val['value'].value[0]).toBe(-10.5);

        select = new Select({
            ...defaultProps,
            values: {a: { value: [-10.5, 0.5, 9] , type: 4}, b: { value: [4, -6, 10] , type: 4}, condition: { value: [false], type: 0}}
        });

        val = select.processNode();
        expect(val['value'].value[0]).toBe(4);
        expect(val['value'].value[1]).toBe(-6);
        expect(val['value'].value[2]).toBe(10);
    });

    it("math/sub", () => {
        let sub: Subtract = new Subtract({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = sub.processNode();
        expect(val['value'].value[0]).toBe(-16);

        sub = new Subtract({
            ...defaultProps,
            values: {a: { value: [-10.5, 0.5, 9] , type: 4}, b: { value: [4, -6, 10] , type: 4}}
        });

        val = sub.processNode();
        expect(val['value'].value[0]).toBe(-14.5);
        expect(val['value'].value[1]).toBe(6.5);
        expect(val['value'].value[2]).toBe(-1);
    });

    it("math/mul", () => {
        let mul: Multiply = new Multiply({
            ...defaultProps,
            values: {a: { value: [-10], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = mul.processNode();
        expect(val['value'].value[0]).toBe(-55);

        mul = new Multiply({
            ...defaultProps,
            values: {a: { value: [-10, -0.5, 9], type: 4}, b: { value: [5, -6, 10], type: 4}}
        });

        val = mul.processNode();
        expect(val['value'].value[0]).toBe(-50);
        expect(val['value'].value[1]).toBe(3);
        expect(val['value'].value[2]).toBe(90);
    });

    it("math/div", () => {
        let div: Divide = new Divide({
            ...defaultProps,
            values: {a: { value: [-10], type: 2}, b: { value: [5], type: 2}}
        });

        let val = div.processNode();
        expect(val['value'].value[0]).toBe(-2);

        div = new Divide({
            ...defaultProps,
            values: {a: { value: [0, -6, 9] , type: 4}, b: { value: [-5, -0.5, 0] , type: 4}}
        });

        val = div.processNode();
        expect(val['value'].value[0]).toBe(-0);
        expect(val['value'].value[1]).toBe(12);
        expect(val['value'].value[2]).toBe(Infinity);
    });

    it("math/rem", () => {
        let rem: Remainder = new Remainder({
            ...defaultProps,
            values: {a: { value: [-10], type: 2}, b: { value: [5], type: 2}}
        });

        let val = rem.processNode();
        expect(val['value'].value[0]).toBe(-0);

        rem = new Remainder({
            ...defaultProps,
            values: {a: { value: [-10, 10, 9] , type: 4}, b: { value: [5, 6, 10] , type: 4}}
        });

        val = rem.processNode();
        expect(val['value'].value[0]).toBe(-0);
        expect(val['value'].value[1]).toBe(4);
        expect(val['value'].value[2]).toBe(9);
    });

    it("math/max", () => {
        let max: Max = new Max({
            ...defaultProps,
            values: {a: { value: [-10], type: 2}, b: { value: [5], type: 2}}
        });

        let val = max.processNode();
        expect(val['value'].value[0]).toBe(5);

        max = new Max({
            ...defaultProps,
            values: {a: { value: [-10, 10, -9] , type: 4}, b: { value: [5, 6, -10] , type: 4}}
        });

        val = max.processNode();
        expect(val['value'].value[0]).toBe(5);
        expect(val['value'].value[1]).toBe(10);
        expect(val['value'].value[2]).toBe(-9);
    });

    it("math/min", () => {
        let min: Min = new Min({
            ...defaultProps,
            values: {a: { value: [-10], type: 2}, b: { value: [5], type: 2}}
        });

        let val = min.processNode();
        expect(val['value'].value[0]).toBe(-10);

        min = new Min({
            ...defaultProps,
            values: {a: { value: [-10, 10, -9] , type: 4}, b: { value: [5, 6, -10] , type: 4}}
        });

        val = min.processNode();
        expect(val['value'].value[0]).toBe(-10);
        expect(val['value'].value[1]).toBe(6);
        expect(val['value'].value[2]).toBe(-10);
    });

    it("math/rad", () => {
        let rad: DegreeToRadians = new DegreeToRadians({
            ...defaultProps,
            values: {a: { value: [180], type: 2}}
        });

        let val = rad.processNode();
        expect(val['value'].value[0]).toBe(Math.PI);

        rad = new DegreeToRadians({
            ...defaultProps,
            values: {a: { value: [-180, 45, 270] , type: 4}}
        });

        val = rad.processNode();
        expect(val['value'].value[0]).toBe(-Math.PI);
        expect(val['value'].value[1]).toBe(Math.PI/4);
        expect(val['value'].value[2]).toBe(Math.PI * (3/2));
    });

    it("math/deg", () => {
        let deg: RadiansToDegrees = new RadiansToDegrees({
            ...defaultProps,
            values: {a: { value: [Math.PI], type: 2}}
        });

        let val = deg.processNode();
        expect(val['value'].value[0]).toBe(180);

        deg = new RadiansToDegrees({
            ...defaultProps,
            values: {a: { value: [Math.PI * 2, -Math.PI, Math.PI * 4] , type: 4}}
        });

        val = deg.processNode();
        expect(val['value'].value[0]).toBe(360);
        expect(val['value'].value[1]).toBe(-180);
        expect(val['value'].value[2]).toBe(720);
    });

    it("math/sin", () => {
        let sin: Sine = new Sine({
            ...defaultProps,
            values: {a: { value: [Math.PI], type: 2}}
        });

        let val = sin.processNode();
        expect(isCloseToVal(val['value'].value[0], 0)).toBe(true);

        sin = new Sine({
            ...defaultProps,
            values: {a: { value: [Math.PI * 2, -Math.PI/2, Math.PI/2] , type: 4}}
        });

        val = sin.processNode();
        expect(isCloseToVal(val['value'].value[0], 0)).toBe(true);
        expect(isCloseToVal(val['value'].value[1], -1)).toBe(true);
        expect(isCloseToVal(val['value'].value[2], 1)).toBe(true);
    });

    it("math/cos", () => {
        let cos: Cosine = new Cosine({
            ...defaultProps,
            values: {a: { value: [Math.PI], type: 2}}
        });

        let val = cos.processNode();
        expect(isCloseToVal(val['value'].value[0], -1)).toBe(true);

        cos = new Cosine({
            ...defaultProps,
            values: {a: { value: [Math.PI * 2, -Math.PI/2, Math.PI/2], type: 4}}
        });

        val = cos.processNode();
        expect(isCloseToVal(val['value'].value[0], 1)).toBe(true);
        expect(isCloseToVal(val['value'].value[1], 0)).toBe(true);
        expect(isCloseToVal(val['value'].value[2], 0)).toBe(true);
    });

    it("math/tan", () => {
        let tan: Tangent = new Tangent({
            ...defaultProps,
            values: {a: { value: [Math.PI / 4], type: 2}}
        });

        let val = tan.processNode();
        expect(isCloseToVal(val['value'].value[0], 1)).toBe(true);

        tan = new Tangent({
            ...defaultProps,
            values: {a: { value: [Math.PI, Math.PI / 2, 3 * Math.PI / 4], type: 4}}
        });

        val = tan.processNode();
        expect(isCloseToVal(val['value'].value[0], 0)).toBe(true);
        //TODO: this is weird it should be inf
        expect(val['value'].value[1] ).toBe(16331239353195370);
        expect(isCloseToVal(val['value'].value[2], -1)).toBe(true);
    });

    it("math/asin", () => {
        let asin: Arcsine = new Arcsine({
            ...defaultProps,
            values: {a: { value: [0.5], type: 2 }}
        });

        let val = asin.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.asin(0.5))).toBe(true);

        asin = new Arcsine({
            ...defaultProps,
            values: {a: { value: [0.86602540378, 0, -0.86602540378], type: 4 }}
        });

        val = asin.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.asin(0.86602540378))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.asin(0))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.asin(-0.86602540378))).toBe(true);
    });

    it("math/acos", () => {
        let acos: Arccosine = new Arccosine({
            ...defaultProps,
            values: {a: { value: [0.5], type: 2 }}
        });

        let val = acos.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.acos(0.5))).toBe(true);

        acos = new Arccosine({
            ...defaultProps,
            values: {a: { value: [0.86602540378, 1, -0.86602540378], type: 4 }}
        });

        val = acos.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.acos(0.86602540378))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.acos(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.acos(-0.86602540378))).toBe(true);
    });

    it("math/atan", () => {
        let atan: Arctangent = new Arctangent({
            ...defaultProps,
            values: {a: { value: [0.5], type: 2 }}
        });

        let val = atan.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.atan(0.5))).toBe(true);

        atan = new Arctangent({
            ...defaultProps,
            values: {a: { value: [0.57735026919, 0, -0.57735026919], type: 4 }}
        });

        val = atan.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.atan(0.57735026919))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.atan(0))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.atan(-0.57735026919))).toBe(true);
    });

    it("math/atan2", () => {
        let atan2: Arctangent2 = new Arctangent2({
            ...defaultProps,
            values: {a: { value: [1.0], type: 2 }, b: { value: [1.0], type: 2 }}
        });

        let val = atan2.processNode();
        expect(val['value'].value[0]).toBe(Math.atan2(1.0, 1.0));

        atan2 = new Arctangent2({
            ...defaultProps,
            values: {a: { value: [0.5, 0, -0.5], type: 4 }, b: { value: [0.86602540378, 1, -0.86602540378], type: 4 }}
        });

        val = atan2.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.atan2(0.5, 0.86602540378))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.atan2(0, 1))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.atan2(-0.5, -0.86602540378))).toBe(true);
    });

    it("math/log", () => {
        let log: Log = new Log({
            ...defaultProps,
            values: {a: { value: [2.0], type: 2 }}
        });

        let val = log.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.log(2.0))).toBe(true);

        log = new Log({
            ...defaultProps,
            values: {a: { value: [1, Math.E, 10], type: 4 }}
        });

        val = log.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.log(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.log(Math.E))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.log(10))).toBe(true);
    });

    it("math/log2", () => {
        let log2: Log2 = new Log2({
            ...defaultProps,
            values: {a: { value: [8.0], type: 2 }}
        });

        let val = log2.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.log2(8.0))).toBe(true);

        log2 = new Log2({
            ...defaultProps,
            values: {a: { value: [1, 2, 16], type: 4 }}
        });

        val = log2.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.log2(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.log2(2))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.log2(16))).toBe(true);
    });

    it("math/log10", () => {
        let log10: Log10 = new Log10({
            ...defaultProps,
            values: {a: { value: [100.0], type: 2 }}
        });

        let val = log10.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.log10(100.0))).toBe(true);

        log10 = new Log10({
            ...defaultProps,
            values: {a: { value: [1, 10, 1000], type: 4 }}
        });

        val = log10.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.log10(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.log10(10))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.log10(1000))).toBe(true);
    });

    it("math/cbrt", () => {
        let cubeRoot: CubeRoot = new CubeRoot({
            ...defaultProps,
            values: {a: { value: [8.0], type: 2 }}
        });

        let val = cubeRoot.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.cbrt(8.0))).toBe(true);

        cubeRoot = new CubeRoot({
            ...defaultProps,
            values: {a: { value: [1, 27, 125], type: 4 }}
        });

        val = cubeRoot.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.cbrt(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.cbrt(27))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.cbrt(125))).toBe(true);
    });

    it("math/sqrt", () => {
        let sqrt: SquareRoot = new SquareRoot({
            ...defaultProps,
            values: {a: { value: [16.0], type: 2 }}
        });

        let val = sqrt.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.sqrt(16.0))).toBe(true);

        sqrt = new SquareRoot({
            ...defaultProps,
            values: {a: { value: [1, 4, 9], type: 4}}
        });

        val = sqrt.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.sqrt(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.sqrt(4))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.sqrt(9))).toBe(true);
    });

    it("math/pow", () => {
        let pow: Power = new Power({
            ...defaultProps,
            values: {a: { value: [2], type: 2}, b: { value: [3], type: 2}}
        });

        let val = pow.processNode();
        expect(val['value'].value[0]).toBe(8);

        pow = new Power({
            ...defaultProps,
            values: {a: { value: [2, 0.5, 10] , type: 4}, b: { value: [-2, 3, 3] , type: 4}}
        });

        val = pow.processNode();
        expect(val['value'].value[0]).toBe(0.25);
        expect(val['value'].value[1]).toBe(0.125);
        expect(val['value'].value[2]).toBe(1000);
    });

    it("math/exp", () => {
        let exp: Exponential = new Exponential({
            ...defaultProps,
            values: {a: { value: [2], type: 2}}
        });

        let val = exp.processNode();
        expect(val['value'].value[0]).toBe(Math.exp(2));

        exp = new Exponential({
            ...defaultProps,
            values: {a: { value: [2, 0.5, -1] , type: 4}}
        });

        val = exp.processNode();
        expect(val['value'].value[0]).toBe(Math.exp(2));
        expect(val['value'].value[1]).toBe(Math.exp(0.5));
        expect(val['value'].value[2]).toBe(Math.exp(-1));
    });

    it("math/clamp", () => {
        let clamp: Clamp = new Clamp({
            ...defaultProps,
            values: {a: { value: [2.5], type: 2}, b: { value: [0], type: 2}, c: { value: [1], type: 2}}
        });

        let val = clamp.processNode();
        expect(val['value'].value[0]).toBe(1);

        clamp = new Clamp({
            ...defaultProps,
            values: {a: { value: [-1, 0.5, 10] , type: 4}, b: { value: [0, 0, 3] , type: 4}, c: { value: [1, 1, 9] , type: 4}}
        });

        val = clamp.processNode();
        expect(val['value'].value[0]).toBe(0);
        expect(val['value'].value[1]).toBe(0.5);
        expect(val['value'].value[2]).toBe(9);
    });

    it("math/saturate", () => {
        let saturate: Saturate = new Saturate({
            ...defaultProps,
            values: {a: { value: [2.5], type: 2}}
        });

        let val = saturate.processNode();
        expect(val['value'].value[0]).toBe(1);

        saturate = new Saturate({
            ...defaultProps,
            values: {a: { value: [-1, 0.5, 10] , type: 4}}
        });

        val = saturate.processNode();
        expect(val['value'].value[0]).toBe(0);
        expect(val['value'].value[1]).toBe(0.5);
        expect(val['value'].value[2]).toBe(1);
    });

    it("math/mix", () => {
        let mix: Mix = new Mix({
            ...defaultProps,
            values: {a: { value: [2.5], type: 2}, b: { value: [0], type: 2}, c: { value: [0.2], type: 2}}
        });

        let val = mix.processNode();
        expect(val['value'].value[0]).toBe(2);

        mix = new Mix({
            ...defaultProps,
            values: {a: { value: [-1, 0.5, 10] , type: 4}, b: { value: [0, 0, 0] , type: 4}, c: { value: [0.75, 0, 2] , type: 4}}
        });

        val = mix.processNode();
        expect(val['value'].value[0]).toBe(-0.25);
        expect(val['value'].value[1]).toBe(0.5);
        expect(val['value'].value[2]).toBe(-10);
    });

    it("math/negate", () => {
        let neg: Negate = new Negate({
            ...defaultProps,
            values: {a: { value: [2.5], type: 2}}
        });

        let val = neg.processNode();
        expect(val['value'].value[0]).toBe(-2.5);

        neg = new Negate({
            ...defaultProps,
            values: {a: { value: [-1, 0.5, 10] , type: 4}}
        });

        val = neg.processNode();
        expect(val['value'].value[0]).toBe(1);
        expect(val['value'].value[1]).toBe(-0.5);
        expect(val['value'].value[2]).toBe(-10);
    });

    it("math/fract", () => {
        let fract: Fraction = new Fraction({
            ...defaultProps,
            values: {a: { value: [2.5], type: 2}}
        });

        let val = fract.processNode();
        expect(val['value'].value[0]).toBe(0.5);

        fract = new Fraction({
            ...defaultProps,
            values: {a: { value: [-1, 0.5, 10.11] , type: 4}}
        });

        val = fract.processNode();
        expect(isCloseToVal(val['value'].value[0], 0)).toBe(true);
        expect(isCloseToVal(val['value'].value[1], 0.5)).toBe(true);
        expect(isCloseToVal(val['value'].value[2], 0.11)).toBe(true);
    });

    it("math/cosh", () => {
        let cosh: HyperbolicCosine = new HyperbolicCosine({
            ...defaultProps,
            values: {a: { value: [2.0], type: 2 }}
        });

        let val = cosh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.cosh(2.0))).toBe(true);

        cosh = new HyperbolicCosine({
            ...defaultProps,
            values: {a: { value: [1, 0, 0.5], type: 4}}
        });

        val = cosh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.cosh(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.cosh(0))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.cosh(0.5))).toBe(true);
    });

    it("math/sinh", () => {
        let sinh: HyperbolicSine = new HyperbolicSine({
            ...defaultProps,
            values: {a: { value: [2.0], type: 2 }}
        });

        let val = sinh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.sinh(2.0))).toBe(true);

        sinh = new HyperbolicSine({
            ...defaultProps,
            values: {a: { value: [1, 0, 0.5], type: 4}}
        });

        val = sinh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.sinh(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.sinh(0))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.sinh(0.5))).toBe(true);
    });

    it("math/tanh", () => {
        let tanh: HyperbolicTangent = new HyperbolicTangent({
            ...defaultProps,
            values: {a: { value: [2.0], type: 2 }}
        });

        let val = tanh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.tanh(2.0))).toBe(true);

        tanh = new HyperbolicTangent({
            ...defaultProps,
            values: {a: { value: [1, 0, 0.5], type: 4}}
        });

        val = tanh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.tanh(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.tanh(0))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.tanh(0.5))).toBe(true);
    });

    it("math/acosh", () => {
        let acosh: InverseHyperbolicCosine = new InverseHyperbolicCosine({
            ...defaultProps,
            values: {a: { value: [2.0], type: 2 }}
        });

        let val = acosh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.acosh(2.0))).toBe(true);

        acosh = new InverseHyperbolicCosine({
            ...defaultProps,
            values: {a: { value: [1, 2, 3], type: 4}}
        });

        val = acosh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.acosh(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.acosh(2))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.acosh(3))).toBe(true);
    });

    it("math/asinh", () => {
        let asinh: InverseHyperbolicSine = new InverseHyperbolicSine({
            ...defaultProps,
            values: {a: { value: [2.0], type: 2 }}
        });

        let val = asinh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.asinh(2.0))).toBe(true);

        asinh = new InverseHyperbolicSine({
            ...defaultProps,
            values: {a: { value: [1, 2, 3], type: 4}}
        });

        val = asinh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.asinh(1))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.asinh(2))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.asinh(3))).toBe(true);
    });

    it("math/atanh", () => {
        let atanh: InverseHyperbolicTangent = new InverseHyperbolicTangent({
            ...defaultProps,
            values: {a: { value: [0.5], type: 2 }}
        });

        let val = atanh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.atanh(0.5))).toBe(true);

        atanh = new InverseHyperbolicTangent({
            ...defaultProps,
            values: {a: { value: [0.8, 0.2, 0.4], type: 4}}
        });

        val = atanh.processNode();
        expect(isCloseToVal(val['value'].value[0], Math.atanh(0.8))).toBe(true);
        expect(isCloseToVal(val['value'].value[1], Math.atanh(0.2))).toBe(true);
        expect(isCloseToVal(val['value'].value[2], Math.atanh(0.4))).toBe(true);
    });

    it("math/normalize", () => {
        const normalize: Normalize = new Normalize({
            ...defaultProps,
            values: {a: { value: [3.0, 4.0, 5.0], type: 4}}
        });

        const normalizedVector = normalize.processNode();

        const vecLen = Math.sqrt(3**2 + 4**2 + 5**2);

        expect(isCloseToVal(normalizedVector['value'].value[0], 3/vecLen)).toBe(true);
        expect(isCloseToVal(normalizedVector['value'].value[1], 4/vecLen)).toBe(true);
        expect(isCloseToVal(normalizedVector['value'].value[2], 5/vecLen)).toBe(true);
    });

    it("math/length", () => {
        const vectorLen: VectorLength = new VectorLength({
            ...defaultProps,
            values: {a: { value: [3.0, 4.0, 5.0], type: 4}}
        });

        const val = vectorLen.processNode();

        const expectedVecLen = Math.sqrt(3**2 + 4**2 + 5**2);

        expect(isCloseToVal(val['value'].value[0], expectedVecLen)).toBe(true);
    });

    it("math/transform", () => {
        const transform: Transform = new Transform({
            ...defaultProps,
            values: {a: { value: [1,2,3,4], type: 5 }, b: { value: [
                        [1, 2, 3, 4],
                        [5, 6, 7, 8],
                        [9, 10, 11, 12],
                        [13, 14, 15, 16],
                    ],
                    type: 6
                }
            }
        });

        const val = transform.processNode();

        expect(val['value'].value[0]).toBe(90);
        expect(val['value'].value[1]).toBe(100);
        expect(val['value'].value[2]).toBe(110);
        expect(val['value'].value[3]).toBe(120);
    });

    it("math/dot", () => {
        const dot = new Dot({
            ...defaultProps,
            values: {a: { value: [-10.5, 0.5, 9] , type: 4}, b: { value: [4, -6, 10] , type: 4}}
        });

        const val = dot.processNode();
        const expected = -10.5 * 4 + 0.5 * -6 + 9 * 10
        expect(val['value'].value[0]).toBe(expected);
    });

    it("math/cross", () => {
        const cross: Cross = new Cross({
            ...defaultProps,
            values: {a: { value: [2.0, 1.0, 3.0], type: 4 }, b: { value: [4.0, -2.0, 1.0], type: 4 }}
        });

        const val = cross.processNode()['value'].value;

        const expected = [
            1.0 * 1.0 - 3.0 * -2.0,
            3.0 * 4.0 - 2.0 * 1.0,
            2.0 * -2.0 - 1.0 * 4.0
        ];

        expect(expected[0]).toEqual(val[0]);
        expect(expected[1]).toEqual(val[1]);
        expect(expected[2]).toEqual(val[2]);
    });

    it("math/rotated2D", () => {
        const rotate2D: Rotate2D = new Rotate2D({
            ...defaultProps,
            values: {a: { value: [1.0, 0.0], type: 3 }, b: { value: [Math.PI / 2], type: 2 }}
        });

        const val = rotate2D.processNode()['value'].value;

        const expected = [0.0, 1.0];

        expect(isCloseToVal(expected[0], val[0])).toBe(true);
        expect(isCloseToVal(expected[1], val[1])).toBe(true);
    });

    it("math/rotated3D", () => {
        const rotate3D: Rotate3D = new Rotate3D({
            ...defaultProps,
            values: {a: { value: [1.0, 0.0, 0.0], type: 4 }, b: { value: [0.0, 1.0, 0.0], type: 4 }, c: { value: [Math.PI / 2], type: 2 }}
        });

        const val = rotate3D.processNode()['value'].value;

        const cos_theta = Math.cos(Math.PI / 2);
        const sin_theta = Math.sin(Math.PI / 2);

        const a = [1.0, 0.0, 0.0];
        const b = [0.0, 1.0, 0.0];

        const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        const parallelCoeff = dot * (1 - cos_theta);
        const parallel = [
            b[0] * parallelCoeff,
            b[1] * parallelCoeff,
            b[2] * parallelCoeff
        ];
        const perpendicular = [
            (a[0] - dot * b[0]) * sin_theta,
            (a[1] - dot * b[1]) * sin_theta,
            (a[2] - dot * b[2]) * sin_theta
        ];
        const expected = [
            a[0] * cos_theta + perpendicular[0] + parallel[0],
            a[1] * cos_theta + perpendicular[1] + parallel[1],
            a[2] * cos_theta + perpendicular[2] + parallel[2],
        ];

        expect(expected[0]).toEqual(val[0]);
        expect(expected[1]).toEqual(val[1]);
        expect(expected[2]).toEqual(val[2]);
    });

    it("math/transpose", () => {
        const transpose: Transpose = new Transpose({
            ...defaultProps,
            values: {a: { value: [
                        [1, 2, 3, 4],
                        [5, 6, 7, 8],
                        [9, 10, 11, 12],
                        [13, 14, 15, 16],
                    ],
                    type: 6
                }
            }
        });

        const val = transpose.processNode();

        expect(val['value'].value[0][0]).toBe(1);
        expect(val['value'].value[0][1]).toBe(5);
        expect(val['value'].value[3][2]).toBe(12);
        expect(val['value'].value[3][0]).toBe(4);
    });

    it("math/determinant", () => {
        const determinant: Determinant = new Determinant({
            ...defaultProps,
            values: {a: { value: [
                        [1, 3, 1, 4],
                        [3, 9, 5, 15],
                        [0, 2, 1, 1],
                        [0, 4, 2, 3],
                    ],
                    type: 6
                }
            }
        });

        const val = determinant.processNode();

        expect(val['value'].value[0]).toBe(-4);
    });

    it("math/matmul", () => {
        const matmul: MatMul = new MatMul({
            ...defaultProps,
            values: {a: { value: [
                        [1, 2, 3, 4],
                        [5, 6, 7, 8],
                        [9, 10, 11, 12],
                        [13, 14, 15, 16],
                    ],
                    type: 6
                },
                b: { value: [
                        [1, 2, 3, 4],
                        [5, 6, 7, 8],
                        [9, 10, 11, 12],
                        [13, 14, 15, 16],
                    ],
                    type: 6
                }
            }
        });

        const val = matmul.processNode();

        expect(val['value'].value[0][0]).toBe(90);
        expect(val['value'].value[1][2]).toBe(254);
        expect(val['value'].value[3][3]).toBe(600);
        expect(val['value'].value[2][0]).toBe(314);
    });

    it("math/isInfNode", () => {
        let isInfNode: IsInfNode = new IsInfNode({
            ...defaultProps,
            values: {a: { value: [1.0], type: 2 }}
        });

        let val = isInfNode.processNode()['value'].value;
        expect(val[0]).toBe(false);

        isInfNode = new IsInfNode({
            ...defaultProps,
            values: {a: { value: [Infinity], type: 2 }}
        });

        val = isInfNode.processNode()['value'].value;
        expect(val[0]).toBe(true);
    });

    it("math/isNaNNode", () => {
        let isNaNNode: IsNaNNode = new IsNaNNode({
            ...defaultProps,
            values: {a: { value: [1.0], type: 2 }}
        });

        let val = isNaNNode.processNode()['value'].value;
        expect(val[0]).toBe(false);

        isNaNNode = new IsNaNNode({
            ...defaultProps,
            values: {a: { value: [NaN], type: 2 }}
        });

        val = isNaNNode.processNode()['value'].value;
        expect(val[0]).toBe(true);
    });

    it("math/eq", () => {
        let eq: Equality = new Equality({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = eq.processNode()['value'].value;
        expect(val[0]).toBe(false);

        eq = new Equality({
            ...defaultProps,
            values: {a: { value: [5.0], type: 2}, b: { value: [5.0], type: 2}}
        });
        val = eq.processNode()['value'].value;
        expect(val[0]).toBe(true);

        eq = new Equality({
            ...defaultProps,
            values: {a: { value: [-10.5, 0.5, 9] , type: 4}, b: { value: [4, -6, 10] , type: 4}}
        });

        val = eq.processNode()['value'].value;
        expect(val[0]).toBe(false);

        eq = new Equality({
            ...defaultProps,
            values: {a: { value: [-10.5, 0.5, 9] , type: 4}, b: { value: [-10.5, 0.5, 9] , type: 4}}
        });

        val = eq.processNode()['value'].value;
        expect(val[0]).toBe(true);
    });

    it("math/lt", () => {
        let lt: LessThan = new LessThan({
            ...defaultProps,
            values: {a: { value: [-10.5], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = lt.processNode()['value'].value;
        expect(val[0]).toBe(true);

        lt = new LessThan({
            ...defaultProps,
            values: {a: { value: [5.0], type: 2}, b: { value: [5.0], type: 2}}
        });
        val = lt.processNode()['value'].value;
        expect(val[0]).toBe(false);
    });

    it("math/le", () => {
        let le: LessThanOrEqualTo = new LessThanOrEqualTo({
            ...defaultProps,
            values: {a: { value: [5.0], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = le.processNode()['value'].value;
        expect(val[0]).toBe(true);

        le = new LessThanOrEqualTo({
            ...defaultProps,
            values: {a: { value: [5.5], type: 2}, b: { value: [5.5], type: 2}}
        });

        val = le.processNode()['value'].value;
        expect(val[0]).toBe(true);

        le = new LessThanOrEqualTo({
            ...defaultProps,
            values: {a: { value: [10.0], type: 2}, b: { value: [5.0], type: 2}}
        });
        val = le.processNode()['value'].value;
        expect(val[0]).toBe(false);
    });

    it("math/gt", () => {
        let gt: GreaterThan = new GreaterThan({
            ...defaultProps,
            values: {a: { value: [10.5], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = gt.processNode()['value'].value;
        expect(val[0]).toBe(true);

        gt = new GreaterThan({
            ...defaultProps,
            values: {a: { value: [5.0], type: 2}, b: { value: [5.0], type: 2}}
        });
        val = gt.processNode()['value'].value;
        expect(val[0]).toBe(false);
    });

    it("math/ge", () => {
        let ge: GreaterThanOrEqualTo = new GreaterThanOrEqualTo({
            ...defaultProps,
            values: {a: { value: [10.0], type: 2}, b: { value: [5.5], type: 2}}
        });

        let val = ge.processNode()['value'].value;
        expect(val[0]).toBe(true);

        ge = new GreaterThanOrEqualTo({
            ...defaultProps,
            values: {a: { value: [5.5], type: 2}, b: { value: [5.5], type: 2}}
        });

        val = ge.processNode()['value'].value;
        expect(val[0]).toBe(true);

        ge = new GreaterThanOrEqualTo({
            ...defaultProps,
            values: {a: { value: [-10.0], type: 2}, b: { value: [5.0], type: 2}}
        });
        val = ge.processNode()['value'].value;
        expect(val[0]).toBe(false);
    });

    it("type/boolToInt", () => {
        let boolToInt: BoolToInt = new BoolToInt({
            ...defaultProps,
            values: {a: { value: [true], type: 0}}
        });

        let val = boolToInt.processNode();

        expect(val['value'].value[0]).toBe(1);

        boolToInt = new BoolToInt({
            ...defaultProps,
            values: {a: { value: [false], type: 0}}
        });

        val = boolToInt.processNode();

        expect(val['value'].value[0]).toBe(0);
    });

    it("type/boolToFloat", () => {
        let boolToFloat: BoolToFloat = new BoolToFloat({
            ...defaultProps,
            values: {a: { value: [true], type: 0}}
        });

        let val = boolToFloat.processNode();

        expect(val['value'].value[0]).toBe(1);

        boolToFloat = new BoolToFloat({
            ...defaultProps,
            values: {a: { value: [false], type: 0}}
        });

        val = boolToFloat.processNode();

        expect(val['value'].value[0]).toBe(0);
    });

    it("type/intToBool", () => {
        let intToBool: IntToBool = new IntToBool({
            ...defaultProps,
            values: {a: { value: [0], type: 1}}
        });

        let val = intToBool.processNode();

        expect(val['value'].value[0]).toBe(false);

        intToBool = new IntToBool({
            ...defaultProps,
            values: {a: { value: [10], type: 1}}
        });

        val = intToBool.processNode();

        expect(val['value'].value[0]).toBe(true);
    });

    it("type/intToFloat", () => {
        let intToFloat = new IntToFloat({
            ...defaultProps,
            values: {a: { value: [10], type: 1}}
        });

        let val = intToFloat.processNode();

        expect(val['value'].value[0]).toBe(10);
    });

    it("type/floatToBool", () => {
        let floatToBool: FloatToBool = new FloatToBool({
            ...defaultProps,
            values: {a: { value: [NaN], type: 2}}
        });

        let val = floatToBool.processNode();

        expect(val['value'].value[0]).toBe(false);

        floatToBool = new FloatToBool({
            ...defaultProps,
            values: {a: { value: [10.0], type: 2}}
        });

        val = floatToBool.processNode();

        expect(val['value'].value[0]).toBe(true);
    });

    it("type/floatToInt", () => {
        let floatToInt: FloatToInt = new FloatToInt({
            ...defaultProps,
            values: {a: { value: [NaN], type: 2}}
        });

        let val = floatToInt.processNode();

        expect(val['value'].value[0]).toBe(0);

        floatToInt = new FloatToInt({
            ...defaultProps,
            values: {a: { value: [10.7], type: 2}}
        });

        val = floatToInt.processNode();

        expect(val['value'].value[0]).toBe(10);
    });

    it("math/not", () => {
        let not: Not = new Not({
            ...defaultProps,
            values: {a: { value: [10], type: 1}}
        });

        let val = not.processNode();

        expect(val['value'].value[0]).toBe(-11);

        not = new Not({
            ...defaultProps,
            values: {a: { value: [true], type: 0}}
        });

        val = not.processNode();

        expect(val['value'].value[0]).toBe(false);
    });

    it("math/and", () => {
        let and: And = new And({
            ...defaultProps,
            values: {a: { value: [11], type: 1}, b: { value: [7], type: 1}}
        });
        
        let val = and.processNode();

        expect(val['value'].value[0]).toBe(3);

        and = new And({
            ...defaultProps,
            values: {a: { value: [false], type: 0}, b: { value: [true], type: 0}}
        });

        val = and.processNode();

        expect(val['value'].value[0]).toBe(false);
    });

    it("math/or", () => {
        let or: Or = new Or({
            ...defaultProps,
            values: {a: { value: [11], type: 1}, b: { value: [7], type: 1}}
        });

        let val = or.processNode();

        expect(val['value'].value[0]).toBe(15);

        or = new Or({
            ...defaultProps,
            values: {a: { value: [true], type: 0}, b: { value: [false], type: 0}}
        });

        val = or.processNode();

        expect(val['value'].value[0]).toBe(true);
    });

    it("math/xor", () => {
        let xor: Xor = new Xor({
            ...defaultProps,
            values: {a: { value: [11], type: 1}, b: { value: [7], type: 1}}
        });

        let val = xor.processNode();

        expect(val['value'].value[0]).toBe(12);

        xor = new Xor({
            ...defaultProps,
            values: {a: { value: [true], type: 0}, b: { value: [true], type: 0}}
        });

        val = xor.processNode();

        expect(val['value'].value[0]).toBe(false);
    });

    it("math/asr", () => {
        const rightShift: RightShift = new RightShift({
            ...defaultProps,
            values: {a: { value: [4], type: 1}, b: { value: [2], type: 1}}
        });

        const val = rightShift.processNode();

        expect(val['value'].value[0]).toBe(1);
    });

    it("math/lsl", () => {
        const leftShift: LeftShift = new LeftShift({
            ...defaultProps,
            values: {a: { value: [4], type: 1}, b: { value: [2], type: 1}}
        });

        const val = leftShift.processNode();

        expect(val['value'].value[0]).toBe(16);
    });

    it("math/clz", () => {
        const countLeadingZeros: CountLeadingZeros = new CountLeadingZeros({
            ...defaultProps,
            values: {a: { value: [4], type: 1}}
        });

        const val = countLeadingZeros.processNode();

        expect(val['value'].value[0]).toBe(29);
    });

    it("math/ctz", () => {
        const countTrailingZeros: CountTrailingZeros = new CountTrailingZeros({
            ...defaultProps,
            values: {a: { value: [4], type: 1}}
        });

        const val = countTrailingZeros.processNode();

        expect(val['value'].value[0]).toBe(2);
    });

    it("math/popcnt", () => {
        const countOneBits: CountOneBits = new CountOneBits({
            ...defaultProps,
            values: {a: { value: [11], type: 1}}
        });

        const val = countOneBits.processNode();

        expect(val['value'].value[0]).toBe(3);
    });
});

const isCloseToVal = (actual: number, expected: number): boolean => {
    return Math.abs(actual - expected) < 0.000001;
}
