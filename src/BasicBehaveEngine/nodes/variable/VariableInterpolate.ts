import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import { cubicBezierEase, linearFloat, slerpFloat4 } from "../../easingUtils";

export class VariableInterpolate extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {variable: {}, useSlerp: {}}
    REQUIRED_VALUES = {value: {}, duration: {}, p1: {}, p2: {}}

    _variable: number;
    _useSlerp: boolean;
    _valueType: string;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VariableInterpolate";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {variable, useSlerp} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._variable = variable[0];
        this._useSlerp = useSlerp[0];
        this._valueType = this.getType(this.variables[this._variable].type);
    }

    override processNode(flowSocket?:string) {
        this.graphEngine.clearValueEvaluationCache();
        const {value, duration, p1, p2} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        this.graphEngine.processNodeStarted(this);
        
        

        if (isNaN(duration) || !isFinite(duration) || isNaN(p1[0]) || !isFinite(p1[0]) || isNaN(p1[1]) || !isFinite(p1[1]) || isNaN(p2[0]) || !isFinite(p2[0]) || isNaN(p2[1]) || !isFinite(p2[1])
            || duration < 0 || p1[0] < 0 || p1[0] > 1 || p2[0] < 0 || p2[0] > 1) {
            if (this.flows.err) {
                this.processFlow(this.flows.err);
            }
            return;
        }
        this.graphEngine.clearVariableInterpolation(this._variable);

        //set of interpolation
        const callback = () => {
            this.graphEngine.clearVariableInterpolation(this._variable);
            if (this.flows.done) {
                this.addEventToWorkQueue(this.flows.done)
            }
        }
        const initialValue = this.variables[this._variable].value![0]!;
        const targetValue = value;
        const startTime = this.graphEngine.lastTickTime;

        const interpolationAction = () => {
            const elapsedDuration = (this.graphEngine.lastTickTime - startTime) / 1000;
            const t = Math.min(elapsedDuration / duration, 1);
            // q is the output progress position: the easing curve evaluated at input progress t
            const q = cubicBezierEase(t, p1, p2);

            if (this._valueType === "float3") {
                const value = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1]), linearFloat(q, initialValue[2], targetValue[2])]
                this.variables[this._variable].value = value;
            } else if (this._valueType === "float4") {
                if (this._useSlerp) {
                    const value = slerpFloat4(q, initialValue, targetValue);
                    this.variables[this._variable].value = value;
                } else {
                    const value = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1]), linearFloat(q, initialValue[2], targetValue[2]), linearFloat(q, initialValue[3], targetValue[3])]
                    this.variables[this._variable].value = value;
                }
            } else if (this._valueType === "float") {
                const value = [linearFloat(q, initialValue, targetValue)]
                this.variables[this._variable].value = [value];
            } else if (this._valueType == "float2") {
                const value = [linearFloat(q, initialValue[0], targetValue[0]), linearFloat(q, initialValue[1], targetValue[1])]
                this.variables[this._variable].value = value;
            }

            if (elapsedDuration >= duration) {
                this.variables[this._variable].value = [targetValue];
                this.graphEngine.clearVariableInterpolation(this._variable);
                callback()
            }
        };
        this.graphEngine.setVariableInterpolationCallback(this._variable, {action: interpolationAction});

        if (this.flows.out) {
            this.processFlow(this.flows.out);
        }
    }
}
