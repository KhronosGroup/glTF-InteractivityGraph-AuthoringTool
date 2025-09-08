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
        this.outValues.selectedNodeIndex = {
            type: this.getTypeIndex('int'),
            value: [-1],
        };
        this.outValues.controllerIndex = {
            type: this.getTypeIndex('int'),
            value: [-1],
        };

        this.setUpOnSelect();
    }

    setUpOnSelect() {
        const callback = (selectionPoint: number[], selectedNodeIndex: number, controllerIndex: number, selectionRayOrigin: number[]) => {
            this.outValues.selectionPoint = {
                type: this.getTypeIndex('float3'),
                value: selectionPoint,
            };
            this.outValues.selectionRayOrigin = {
                type: this.getTypeIndex('float3'),
                value: selectionRayOrigin,
            };
            this.outValues.selectedNodeIndex = {
                type: this.getTypeIndex('int'),
                value: [selectedNodeIndex],
            };
            this.outValues.controllerIndex = {
                type: this.getTypeIndex('int'),
                value: [controllerIndex],
            };

            console.log("OnSelect", {node: this._nodeIndex, outValues: this.outValues});
            
            this.addEventToWorkQueue(this.flows.out);

            if (!this._stopPropagation) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.graphEngine.alertParentOnSelect(selectionPoint, selectedNodeIndex, controllerIndex, selectionRayOrigin, this._nodeIndex);
            }
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.graphEngine.addNodeClickedListener(this._nodeIndex, callback)
    }
}
