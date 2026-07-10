import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnSelect extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {nodeIndex: {defaultValue: [-1]}}
    _nodeIndex: number;
    
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'OnSelect';
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {nodeIndex} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._nodeIndex = nodeIndex[0];

        this.outValues.selectionPoint = {
            type: this.getTypeIndex('float3'),
            value: [NaN, NaN, NaN],
        };
        this.outValues.selectionRayOrigin = {
            type: this.getTypeIndex('float3'),
            value: [NaN, NaN, NaN],
        };
        this.outValues.selectedNode = {
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
            this.outValues.selectedNode = {
                type: this.getTypeIndex('ref'),
                value: [selectedNodeRef ?? null],
            };
            this.outValues.controllerIndex = {
                type: this.getTypeIndex('int'),
                value: [controllerIndex],
            };
            
            this.addEventToWorkQueue(this.flows.out);
        }
        this.graphEngine.selectableNodesIndices.set(Number(this._nodeIndex), callback);
    }
}
