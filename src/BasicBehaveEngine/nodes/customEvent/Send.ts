import {BehaveEngineNode, IBehaviourNodeProps, ICustomEvent} from "../../BehaveEngineNode";

export class Send extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "customEvent"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "Send";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);
    }

    override processNode(flowSocket?: string) {
        const {customEvent} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));

        const customEventDesc: ICustomEvent = this.customEvents[customEvent];
        this.graphEngine.clearValueEvaluationCache();
        const vals = this.evaluateAllValues([...customEventDesc.values].map(val => val.id));
        this.graphEngine.processNodeStarted(this);
        console.log(`Sending ${this.values}`);

        const e = new CustomEvent(`KHR_INTERACTIVITY:${customEventDesc.id}`, {detail: vals});
        document.dispatchEvent(e);
    }
}
