import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import {IInteractivityEvent} from "../../../types/InteractivityGraph";

export class Receive extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {event: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CustomEventReceiveNode";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);
        this.setUpEventListener();
    }

    setUpEventListener() {
        const {event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));

        const customEventDesc: IInteractivityEvent = this.events[event];

        Object.entries(customEventDesc.values).forEach(([key, value]) => {
            // TODO Probably should be the default value based on type
            // TODO Spec says that the default for float is NaN, not sure why
            const defaultValue = 0;
            this.outValues[key] = {
                value: [defaultValue],
                type: value.type,
            }
        });

        this.graphEngine.addCustomEventListener(`KHR_INTERACTIVITY:${customEventDesc.id}`, (e: any) => {
            this.graphEngine.processNodeStarted(this);
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
