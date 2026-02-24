import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class RayCast extends BehaveEngineNode {
    REQUIRED_VALUES = {rayStart: {}, rayEnd: {}, collisionFilterIndex: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "RayCast";
        this.validateValues(this.values);
        this.outValues.hitNodeIndex = { value: [-1], type: this.getTypeIndex('int')};
        this.outValues.hitFraction = { value: [NaN], type: this.getTypeIndex('float')};
        this.outValues.hitNormal = { value: [NaN, NaN, NaN], type: this.getTypeIndex('vec3')};

    }

    override processNode(flowSocket?: string): void {
        this.graphEngine.clearValueEvaluationCache();
        const {rayStart, rayEnd, collisionFilterIndex} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));

        this.graphEngine.processNodeStarted(this);

        const hitResult = this.graphEngine.rayCastRigidBodies(rayStart, rayEnd, collisionFilterIndex);
        if (hitResult.hitNodeIndex < 0) {
            this.outValues.hitNodeIndex = { value: [-1], type: this.getTypeIndex('int')};
            this.outValues.hitFraction = { value: [NaN], type: this.getTypeIndex('float')};
            this.outValues.hitNormal = { value: [NaN, NaN, NaN], type: this.getTypeIndex('vec3')};
            if (this.flows.miss) {
                this.processFlow(this.flows.miss);
            }
        } else {
            this.outValues.hitNodeIndex = { value: [hitResult.hitNodeIndex], type: this.getTypeIndex('int')};
            this.outValues.hitFraction = { value: [hitResult.hitFraction], type: this.getTypeIndex('float')};
            this.outValues.hitNormal = { value: hitResult.hitNormal, type: this.getTypeIndex('vec3')};
            if (this.flows.hit) {
                this.processFlow(this.flows.hit);
            }
        }
    }
}
