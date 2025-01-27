import '@babylonjs/core/Culling/ray';
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnHoverIn extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {stopPropagation: {}, nodeIndex: {}}
    _nodeIndex: number;
    _stopPropagation: boolean;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'OnHoverIn';
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {nodeIndex, stopPropagation} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._nodeIndex = nodeIndex;
        this._stopPropagation = stopPropagation;

        this.outValues.selectedNodeIndex = {
            type: this.getTypeIndex('int'),
            value: [-1],
        };
        this.outValues.controllerIndex = {
            type: this.getTypeIndex('int'),
            value: [-1],
        };

        this.setUpOnHoverIn();
    }

    setUpOnHoverIn() {
        const callback = (selectedNodeIndex: number, controllerIndex: number) => {
            if (this.graphEngine.getWorld().glTFNodes[this._nodeIndex].metadata.shouldExecuteHoverIn) {
                this.graphEngine.getWorld().glTFNodes[this._nodeIndex].metadata.shouldExecuteHoverIn = false;
                this.outValues.selectedNodeIndex = {
                    type: this.getTypeIndex('int'),
                    value: [selectedNodeIndex],
                };
                this.outValues.controllerIndex = {
                    type: this.getTypeIndex('int'),
                    value: [controllerIndex],
                };

                this.addEventToWorkQueue(this.flows.out);
            }

            if (!this._stopPropagation) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.graphEngine.alertParentOnHoverIn(selectedNodeIndex, controllerIndex, this._nodeIndex);
            }
        }

        this.graphEngine.getWorld().glTFNodes[this._nodeIndex].metadata.onHoverInCallback = callback;
    }
}
