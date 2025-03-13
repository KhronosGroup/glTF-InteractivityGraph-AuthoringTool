import {BehaveEngineNode, IBehaviourNodeProps} from "../../../BehaveEngineNode";

export class MathSwitch extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {cases: {defaultValue: []}};
    REQUIRED_VALUES = {default: {}, selection: {}}

    _cases: number[];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "MathSwitchNode";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);
        const {cases} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._cases = cases
    }

    override processNode(flowSocket?: string) {
        const evaluatedValues = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        const defaultSelection = evaluatedValues.default;
        const selection = evaluatedValues.selection;

        this.graphEngine.processNodeStarted(this);
        // ensure all cases are defined
        const caseVals = this.evaluateAllValues(Object.keys(this._cases));
        for (const [key, caseVal] of Object.entries(caseVals)) {
            if (caseVal === undefined) {
                throw Error(`case value ${key} is undefined`);
            }
        }

        const typeIndexSelection = this.values['selection'].type!
        const typeSelection: string = this.getType(typeIndexSelection);
        const typeIndexDefault = this.values['default'].type!
        const typeDefault: string = this.getType(typeIndexDefault);
        if (typeSelection !== 'int') {
            throw Error("selection has invalid type expected int")
        }

        // ensure all cases are of the same type as the default
        for (const [key, caseVal] of Object.entries(caseVals)) {
            const typeIndexCase = this.values[key].type!;
            const typeCase: string = this.getType(typeIndexCase);
            if (typeCase !== typeDefault) {
                throw Error(`case value ${key} has invalid type, expected ${typeDefault}`);
            }
        }

        console.log(this._cases);
        console.log(caseVals);

        const selectionIndex = Number(selection);
        if (selectionIndex < 0 || selectionIndex >= this._cases.length) {
            return {
                'value': {value: [defaultSelection], type: typeIndexDefault}
            };
        } else {
            console.log(Object.values(caseVals)[selectionIndex]);
            return {
                'value': {value: [Object.values(caseVals)[selectionIndex]], type: typeIndexDefault}
            };
        }        
    }
}
