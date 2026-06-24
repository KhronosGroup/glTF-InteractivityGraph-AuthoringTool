import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class TriggerEntered extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {nodeIndex: {defaultValue: [-1]}}
    _nodeIndex: number;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'TriggerEntered';
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {nodeIndex} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._nodeIndex = Number(nodeIndex[0]);

        this.outValues.colliderNode = {
            type: this.getTypeIndex('ref'),
            value: [-1],
        };
        this.outValues.motionNode = {
            type: this.getTypeIndex('ref'),
            value: [-1],
        };


        this.setUpOnTriggerEntered();
    }

    setUpOnTriggerEntered() {
        const callback = (colliderNodeRef: number, motionNodeRef: number | undefined) => {
            this.outValues.colliderNode = {
                type: this.getTypeIndex('ref'),
                value: [colliderNodeRef],
            };
            this.outValues.motionNode = {
                type: this.getTypeIndex('ref'),
                value: [motionNodeRef ?? -1],
            };

            console.log("TriggerEntered", {node: this._nodeIndex, outValues: this.outValues});
            
            this.addEventToWorkQueue(this.flows.out);

        }
        const triggerCallbacks = this.graphEngine.rigidBodyTriggerNodeIndices.get(this._nodeIndex);
        if (triggerCallbacks) {
            triggerCallbacks.triggerEntered = callback;
        } else {
            this.graphEngine.rigidBodyTriggerNodeIndices.set(this._nodeIndex, { triggerEntered: callback });
        }
    }
}
