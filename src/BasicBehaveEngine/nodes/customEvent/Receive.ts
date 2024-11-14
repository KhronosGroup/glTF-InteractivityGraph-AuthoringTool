import {BehaveEngineNode, IBehaviourNodeProps, ICustomEvent} from "../../BehaveEngineNode";

export class Receive extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "event"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CustomEventReceiveNode";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);
        this.setUpEventListener();
    }

    setUpEventListener() {
        const {event} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));

        const customEventDesc: ICustomEvent = this.events[event];

        customEventDesc.values.forEach((key) => {
            // TODO Probably should be the default value based on type
            // TODO Spec says that the default for float is NaN, not sure why
            const defaultValue = 0;
            this.outValues[key.id] = {
                id: key.id,
                value: defaultValue,
                type: key.type,
            }
        });

        this.graphEngine.addCustomEventListener(`KHR_INTERACTIVITY:${customEventDesc.id}`, (e: any) => {
            this.graphEngine.processNodeStarted(this);
            const ce = (e as CustomEvent).detail as { [key: string]: any };
            Object.keys(ce).forEach((key) => {
                const typeIndex = customEventDesc.values.find(val => val.id === key)!.type!
                const typeName: string = this.getType(typeIndex);
                const rawVal = ce[key];
                const val = this.parseType(typeName, [rawVal]);
                this.outValues[key] = {
                    id: key,
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
