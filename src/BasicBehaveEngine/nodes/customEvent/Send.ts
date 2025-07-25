import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import {IInteractivityEvent} from "../../types/InteractivityGraph";
export class Send extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {event: {}}
    _event: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Send";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._event = event;
    }

    override processNode(flowSocket?: string) {
        const customEventDesc: IInteractivityEvent = this.events[this._event];
        this.graphEngine.clearValueEvaluationCache();
        const vals = this.evaluateAllValues(Object.keys(customEventDesc.values));
        this.graphEngine.processNodeStarted(this);
        this.graphEngine.dispatchCustomEvent(`KHR_INTERACTIVITY:${customEventDesc.id}`, vals);

        super.processNode(flowSocket);
    }
}
