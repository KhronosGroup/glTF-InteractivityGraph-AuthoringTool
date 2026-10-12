import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import {getCustomEventChannel, IInteractivityEvent} from "../../types/InteractivityGraph";
export class Send extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
    REQUIRED_CONFIGURATIONS = {event: {}}
    _event: number;
    _valueKeys: string[] | undefined;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Send";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._event = event[0];
    }

    override processNode(flowSocket?: string) {
        const customEventDesc: IInteractivityEvent = this.events[this._event];
        this.graphEngine.clearValueEvaluationCache();
        if (this._valueKeys === undefined) {
            this._valueKeys = Object.keys(customEventDesc.values ?? {});
        }
        const vals = this.evaluateAllValues(this._valueKeys);
        this.graphEngine.processNodeStarted(this);

        this.graphEngine.dispatchCustomEvent(getCustomEventChannel(customEventDesc, this._event), vals);

        super.processNode(flowSocket);
    }
}
