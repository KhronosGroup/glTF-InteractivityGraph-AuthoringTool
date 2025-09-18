import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnHoverIn extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {stopPropagation: {defaultValue: [false]}, nodeIndex: {defaultValue: [-1]}}
    _nodeIndex: number;
    _stopPropagation: boolean;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'OnHoverIn';
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {nodeIndex, stopPropagation} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._nodeIndex = nodeIndex[0];
        this._stopPropagation = stopPropagation[0];

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
        const callback = (selectedNodeIndex: number | undefined, controllerIndex: number, firstCommonHoverNodeIndex: number | undefined) => {
            const hoverInformation = this.graphEngine.hoverableNodesIndices.get(this._nodeIndex);
            if (hoverInformation) {
                this.outValues.selectedNodeIndex = {
                    type: this.getTypeIndex('int'),
                    value: [selectedNodeIndex ?? -1],
                };
                this.outValues.controllerIndex = {
                    type: this.getTypeIndex('int'),
                    value: [controllerIndex],
                };

                this.addEventToWorkQueue(this.flows.out);
            }

            if (!this._stopPropagation) {
                const parentNodeIndex = this.graphEngine.getParentNodeIndex(this._nodeIndex);
                this.graphEngine.alertOnHoverIn(selectedNodeIndex, controllerIndex, parentNodeIndex, firstCommonHoverNodeIndex);
            }
        }
        const hoverInformation = this.graphEngine.hoverableNodesIndices.get(this._nodeIndex);
        if (hoverInformation) {
            hoverInformation.callbackHoverIn = callback;
        } else {
            this.graphEngine.hoverableNodesIndices.set(this._nodeIndex, { callbackHoverIn: callback });
        }
    }
}
