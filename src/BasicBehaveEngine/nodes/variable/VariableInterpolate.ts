import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import { cubicBezierEase, linearFloat, slerpFloat4 } from "../../easingUtils";

export class VariableInterpolate extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
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
        // variables store every type as a flat component array (float -> [x], float4 -> [x,y,z,w])
        const initialValue: number[] = [...this.variables[this._variable].value!];
        const targetValue: number[] = Array.isArray(value) ? [...value] : [value];
        const startTime = this.graphEngine.lastTickTime;

        const interpolationAction = () => {
            const elapsedDuration = (this.graphEngine.lastTickTime - startTime) / 1000;
            const t = Math.min(elapsedDuration / duration, 1);
            // q is the output progress position: the easing curve evaluated at input progress t
            const q = cubicBezierEase(t, p1, p2);

            if (this._valueType === "float4" && this._useSlerp) {
                this.variables[this._variable].value = slerpFloat4(q, initialValue, targetValue);
            } else {
                this.variables[this._variable].value = targetValue.map((target, i) => linearFloat(q, initialValue[i], target));
            }

            if (elapsedDuration >= duration) {
                this.variables[this._variable].value = targetValue;
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
