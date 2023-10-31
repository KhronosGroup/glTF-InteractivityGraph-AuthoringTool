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

        this.setUpOnSelect();
    }

    setUpOnSelect() {
        const callback = (localHitLocation: number[], hitNodeIndex: number) => {
            this.outValues.localHitLocation = {
                id: 'pos3D',
                value: localHitLocation,
            };
            this.outValues.hitNodeIndex = {
                id: 'hitNodeIndex',
                value: hitNodeIndex,
            };

            this.addEventToWorkQueue(this.flows.out);

            if (!this._stopPropagation) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.graphEngine.alertParentOnSelect(localHitLocation, hitNodeIndex, this._nodeIndex);
            }
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.graphEngine.addNodeClickedListener(this._nodeIndex, callback)
    }
}
