import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnHoverOut extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {nodeIndex: {defaultValue: [-1]}}
    _nodeIndex: number;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'OnHoverOut';
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {nodeIndex} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._nodeIndex = Number(nodeIndex[0]);

        this.outValues.hoveredNode = {
            type: this.getTypeIndex('ref'),
            value: [null],
        };
        this.outValues.controllerIndex = {
            type: this.getTypeIndex('int'),
            value: [-1],
        };
        this.outValues.event = {
            type: this.getTypeIndex('ref'),
            value: [this._nodeIndex],
        };

        this.setUpOnHoverOut();
    }

    setUpOnHoverOut() {
        const callback = (selectedNodeRef: unknown, controllerIndex: number, firstCommonHoverNodeIndex: number | undefined) => {
            const hoverInformation = this.graphEngine.hoverableNodesIndices.get(this._nodeIndex);
            if (hoverInformation) {
                this.outValues.hoveredNode = {
                    type: this.getTypeIndex('ref'),
                    value: [selectedNodeRef ?? null],
                };
                this.outValues.controllerIndex = {
                    type: this.getTypeIndex('int'),
                    value: [controllerIndex],
                };

                this.addEventToWorkQueue(this.flows.out);
            }

            this.graphEngine.queueFunctionCall(() => {
                if (!this.graphEngine.propagationCancelled.has(this._nodeIndex)) {
                    const parentNodeIndex = this.graphEngine.getParentNodeIndex(this._nodeIndex);
                    this.graphEngine.alertOnHoverOut(selectedNodeRef, controllerIndex, parentNodeIndex, firstCommonHoverNodeIndex);
                }
            });
        }
        const hoverInformation = this.graphEngine.hoverableNodesIndices.get(this._nodeIndex);
        if (hoverInformation) {
            hoverInformation.callbackHoverOut = callback;
        } else {
            this.graphEngine.hoverableNodesIndices.set(this._nodeIndex, { callbackHoverOut: callback });
        }
    }
}
