import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import { cubicBezier, linearFloat, slerpFloat4 } from "../../easingUtils";

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
        const startTime = Date.now();

        const interpolationAction = () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            const t = Math.min(elapsedDuration / duration, 1);
            const p = cubicBezier(t, {x: 0, y:0}, {x: p1[0], y:p1[1]}, {x: p2[0], y:p2[1]}, {x: 1, y:1});

            if (this._valueType === "float3") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1]), linearFloat(p.y, initialValue[2], targetValue[2])]
                this.variables[this._variable].value = value;
            } else if (this._valueType === "float4") {
                if (this._useSlerp) {
                    const value = slerpFloat4(t, initialValue, targetValue);
                    this.variables[this._variable].value = value;
                } else {
                    const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1]), linearFloat(p.y, initialValue[2], targetValue[2]), linearFloat(p.y, initialValue[3], targetValue[3])]
                    this.variables[this._variable].value = value;
                }
            } else if (this._valueType === "float") {
                const value = [linearFloat(p.y, initialValue, targetValue)]
                this.variables[this._variable].value = [value];
            } else if (this._valueType == "float2") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0]), linearFloat(p.y, initialValue[1], targetValue[1])]
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
