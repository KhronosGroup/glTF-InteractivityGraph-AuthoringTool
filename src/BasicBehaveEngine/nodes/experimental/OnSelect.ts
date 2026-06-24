import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnSelect extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {stopPropagation: {defaultValue: [false]}, nodeIndex: {defaultValue: [-1]}}
    _nodeIndex: number;
    _stopPropagation: boolean;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'OnSelect';
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {nodeIndex, stopPropagation} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._nodeIndex = nodeIndex[0];
        this._stopPropagation = stopPropagation[0];

        this.outValues.selectionPoint = {
            type: this.getTypeIndex('float3'),
            value: [NaN, NaN, NaN],
        };
        this.outValues.selectionRayOrigin = {
            type: this.getTypeIndex('float3'),
            value: [NaN, NaN, NaN],
        };
        this.outValues.selectedNodeRef = {
            type: this.getTypeIndex('ref'),
            value: [null],
        };
        this.outValues.controllerIndex = {
            type: this.getTypeIndex('int'),
            value: [-1],
        };

        this.setUpOnSelect();
    }

    setUpOnSelect() {
        const callback = (
            selectedNodeRef: any,
            controllerIndex: number,
            selectionPoint: [number, number, number] | undefined,
            selectionRayOrigin: [number, number, number] | undefined
        ) => {
            this.outValues.selectionPoint = {
                type: this.getTypeIndex('float3'),
                value: selectionPoint ?? [NaN, NaN, NaN],
            };
            this.outValues.selectionRayOrigin = {
                type: this.getTypeIndex('float3'),
                value: selectionRayOrigin ?? [NaN, NaN, NaN],
            };
            this.outValues.selectedNodeRef = {
                type: this.getTypeIndex('ref'),
                value: [selectedNodeRef ?? null],
            };
            this.outValues.controllerIndex = {
                type: this.getTypeIndex('int'),
                value: [controllerIndex],
            };
            
            this.addEventToWorkQueue(this.flows.out);

            if (!this._stopPropagation) {
                const parentNodeIndex = this.graphEngine.getParentNodeIndex(this._nodeIndex);
                this.graphEngine.alertOnSelect(selectedNodeRef, controllerIndex, selectionPoint, selectionRayOrigin, parentNodeIndex);
            }
        }
        this.graphEngine.selectableNodesIndices.set(Number(this._nodeIndex), callback);
    }
}
