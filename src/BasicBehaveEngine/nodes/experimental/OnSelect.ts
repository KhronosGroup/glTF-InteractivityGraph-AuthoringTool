import '@babylonjs/core/Culling/ray';
import {Vector2 } from '@babylonjs/core/Maths/math.vector';
import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OnSelect extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "stopPropagation"}, {id: "nodeIndex"}]
    _nodeIndex: number;
    _stopPropagation: boolean;
    pointer: Vector2;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'OnSelect';
        this.pointer = new Vector2();
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {nodeIndex, stopPropagation} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._nodeIndex = nodeIndex;
        this._stopPropagation = stopPropagation;

        this.outValues.selectionPoint = {
            id: 'selectionPoint',
            type: this.getTypeIndex('float3'),
            value: [NaN, NaN, NaN],
        };
        this.outValues.selectionRayOrigin = {
            id: 'selectionRayOrigin',
            type: this.getTypeIndex('float3'),
            value: [NaN, NaN, NaN],
        };
        this.outValues.selectedNodeIndex = {
            id: 'selectedNodeIndex',
            type: this.getTypeIndex('int'),
            value: [-1],
        };
        this.outValues.controllerIndex = {
            id: 'controllerIndex',
            type: this.getTypeIndex('int'),
            value: [-1],
        };

        this.setUpOnSelect();
    }

    setUpOnSelect() {
        const callback = (selectionPoint: number[], selectedNodeIndex: number, controllerIndex: number, selectionRayOrigin: number[]) => {
            this.outValues.selectionPoint = {
                id: 'selectionPoint',
                type: this.getTypeIndex('float3'),
                value: selectionPoint,
            };
            this.outValues.selectionRayOrigin = {
                id: 'selectionRayOrigin',
                type: this.getTypeIndex('float3'),
                value: selectionRayOrigin,
            };
            this.outValues.selectedNodeIndex = {
                id: 'selectedNodeIndex',
                type: this.getTypeIndex('int'),
                value: [selectedNodeIndex],
            };
            this.outValues.controllerIndex = {
                id: 'controllerIndex',
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
