import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class EventStopPropagation extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {stopImmediate: {defaultValue: [false]}, event: {defaultValue: [-1]}}
    _stopImmediate: boolean;
    _event: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'EventStopPropagation';
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {stopImmediate, event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._stopImmediate = stopImmediate[0];
        this._event = Number(event[0]);
    }

    processNode(flowSocket?: string) {
        this.graphEngine.propagationCancelled.add(this._event);
        super.processNode(flowSocket);
    }
}
