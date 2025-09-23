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
        this._event = event[0];

        this.setUpEventListener();
    }

    setUpEventListener() {
        const {event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));

        const customEventDesc: IInteractivityEvent = this.events[event[0]];

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
                return [JSON.parse(val[0]) === true];
            case "int":
                return [Number(val[0])];
            case "float":
                return [Number(val[0])];
            case "float2":
                return this.parseMaybeJSON(val[0])
            case "float3":
                return this.parseMaybeJSON(val[0])
            case "float4":
                return this.parseMaybeJSON(val[0])
            case "float2x2":
                return this.parseMaybeJSON(val[0], 2);
            case "float3x3":
                return this.parseMaybeJSON(val[0], 3);
            case "float4x4":
                return this.parseMaybeJSON(val[0], 4);
            default:
                return val
        }
    }

    parseMaybeJSON(input: any, matrixWidth?: number): any {
        console.log("CHECK HERE")
        console.log(input)
        let inputCopy = JSON.parse(JSON.stringify(input));
        if (typeof inputCopy === "string") {
          try {
            inputCopy = JSON.parse(inputCopy);
          } catch (e) {
            throw new Error("Invalid JSON string");
          }
        }
        if (matrixWidth && Array.isArray(inputCopy) && inputCopy.length === matrixWidth * matrixWidth) {
            // If the input is a flat array with the correct length, convert it to a 2D array
            const matrix: number[][] = [];
            for (let i = 0; i < matrixWidth; i++) {
                matrix[i] = inputCopy.slice(i * matrixWidth, (i + 1) * matrixWidth);
            }
            return matrix;
        }
        // Already an object/array/etc.
        return inputCopy;
      }
}
