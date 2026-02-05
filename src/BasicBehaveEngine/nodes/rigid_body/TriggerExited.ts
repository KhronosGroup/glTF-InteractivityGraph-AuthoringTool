import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class TriggerExited extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {nodeIndex: {defaultValue: [-1]}}
    _nodeIndex: number;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'TriggerExited';
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {nodeIndex} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._nodeIndex = Number(nodeIndex[0]);

        this.outValues.colliderNodeIndex = {
            type: this.getTypeIndex('int'),
            value: [-1],
        };
        this.outValues.motionNodeIndex = {
            type: this.getTypeIndex('int'),
            value: [-1],
        };


        this.setUpOnTriggerExited();
    }

    setUpOnTriggerExited() {
        const callback = (colliderNodeIndex: number, motionNodeIndex: number | undefined) => {
            this.outValues.colliderNodeIndex = {
                type: this.getTypeIndex('int'),
                value: [colliderNodeIndex],
            };
            this.outValues.motionNodeIndex = {
                type: this.getTypeIndex('int'),
                value: [motionNodeIndex ?? -1],
            };

            console.log("TriggerExited", {node: this._nodeIndex, outValues: this.outValues});
            
            this.addEventToWorkQueue(this.flows.out);

        }
        const triggerCallbacks = this.graphEngine.rigidBodyTriggerNodeIndices.get(this._nodeIndex);
        if (triggerCallbacks) {
            triggerCallbacks.triggerExited = callback;
        } else {
            this.graphEngine.rigidBodyTriggerNodeIndices.set(this._nodeIndex, { triggerExited: callback });
        }
    }
}
