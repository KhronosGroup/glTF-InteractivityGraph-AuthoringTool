import {BehaveEngineNode, IBehaviourNodeProps, ICustomEvent} from "../../BehaveEngineNode";

export class Send extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "event"}]
    _event: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Send";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {event} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._event = event;
    }

    override processNode(flowSocket?: string) {
        const customEventDesc: ICustomEvent = this.customEvents[this._event];
        this.graphEngine.clearValueEvaluationCache();
        const vals = this.evaluateAllValues([...customEventDesc.values].map(val => val.id));
        this.graphEngine.processNodeStarted(this);

        const e = new CustomEvent(`KHR_INTERACTIVITY:${customEventDesc.id}`, {detail: vals});
        document.dispatchEvent(e);

        super.processNode(flowSocket);
    }
}
