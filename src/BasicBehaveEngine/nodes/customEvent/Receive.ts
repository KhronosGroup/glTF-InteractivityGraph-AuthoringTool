import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import {IInteractivityEvent} from "../../types/InteractivityGraph";

export class Receive extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {event: {}}
    _defaultValues: Record<string, any> = {};

    _event: number;
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CustomEventReceiveNode";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._event = event;

        this.setUpEventListener();
    }

    setUpEventListener() {
        const {event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));

        const customEventDesc: IInteractivityEvent = this.events[event];

        const defaultValues: Record<string, any> = {};
        Object.entries(customEventDesc.values).forEach(([key, value]) => {
            const typeName = this.getType(value.type);
            let defaultVal = this.getDefualtValueForType(typeName);
            if (value.value) {
                // if there is a given default value in the CE then use that
                defaultVal = value.value;
            }
            defaultValues[key] = {
                value: defaultVal,
                type: value.type,
            }
        });
        this._defaultValues = defaultValues;
        this.outValues = JSON.parse(JSON.stringify(defaultValues));

        this.graphEngine.addCustomEventListener(`KHR_INTERACTIVITY:${customEventDesc.id}`, (e: any) => {
            this.graphEngine.processNodeStarted(this);

            // reset values to default before processing the event
            this.outValues = JSON.parse(JSON.stringify(this._defaultValues));
            const ce = (e as CustomEvent).detail as { [key: string]: any };
            Object.keys(ce).forEach((ceKey) => {
                const typeIndex = Object.entries(customEventDesc.values).find(([key, _]) => key === ceKey)?.[1]?.type;
                const typeName: string = this.getType(Number(typeIndex));
                const rawVal = ce[ceKey];
                const val = this.parseType(typeName, [rawVal]);
                this.outValues[ceKey] = {
                    value: val,
                    type: typeIndex
                }
            });
            super.processNode();
        })
    }

    override parseType(type: string, val: any) {
        switch (type) {
            case "bool":
                return [val[0] === "true"];
            case "int":
                return [Number(val[0])];
            case "float":
                return [Number(val[0])];
            case "float2":
                return JSON.parse(val);
            case "float3":
                return JSON.parse(val);
            case "float4":
                return JSON.parse(val);
            case "float4x4":
                return JSON.parse(val);
            default:
                return val
        }
    }
}
