import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class ApplyPointImpulse extends BehaveEngineNode {
    REQUIRED_VALUES = {nodeIndex: {}, impulse: {}, position: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ApplyPointImpulse";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): void {
        this.graphEngine.clearValueEvaluationCache();
        const {nodeIndex, impulse, position} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));

        this.graphEngine.processNodeStarted(this);

        this.graphEngine.applyPointImpulseToRigidBody(nodeIndex, impulse, position);
    }
}
