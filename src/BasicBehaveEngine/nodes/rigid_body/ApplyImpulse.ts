import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class ApplyImpulse extends BehaveEngineNode {
    INPUT_FLOWS = ["in"];
    REQUIRED_VALUES = {nodeIndex: {}, linearImpulse: {}, angularImpulse: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "ApplyImpulse";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string): void {
        this.graphEngine.clearValueEvaluationCache();
        const {nodeIndex, linearImpulse, angularImpulse} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));

        this.graphEngine.processNodeStarted(this);

        this.graphEngine.applyImpulseToRigidBody(nodeIndex, linearImpulse, angularImpulse);
    }
}
