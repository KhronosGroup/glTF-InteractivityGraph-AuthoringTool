import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class WorldStopAnimation extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id:"stopMode"}]
    REQUIRED_VALUES = [{id:"animation"}]

    _stopMode: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "WorldStopAnimation";
        this.validateConfigurations(this.configuration);
        const {stopMode} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._stopMode = stopMode;

        this.validateValues(this.values);
        this.outValues["time"] = {
            id: "time",
            value: -1,
            type: this.getTypeIndex('float')
        }
    }

    override processNode(flowSocket?: string): void {
        const {animation} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        let stopTimeOrUndefined: number | undefined = undefined;
        if (this._stopMode === 1) {
            const {stopTime} = this.evaluateAllValues(["stopTime"]);
            stopTimeOrUndefined = stopTime;
        }
        this.graphEngine.processNodeStarted(this);

        if (this.world.animations.length <= animation || animation < 0) {
            if (this.flows.failed) {
                this.processFlow(this.flows.failed);
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.graphEngine.stopAnimation(animation, this._stopMode, stopTimeOrUndefined, (time: number) => {
                this.outValues["time"] = {
                    id: "time",
                    value: time,
                    type: this.getTypeIndex('float')
                }

                if (this.flows.done) {
                    this.addEventToWorkQueue(this.flows.done);
                }
            });


            if (this.flows.out) {
                this.processFlow(this.flows.out);
            }
        }
    }
}
