import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";
import {getCustomEventChannel, IInteractivityEvent, IInteractivityValue} from "../../types/InteractivityGraph";

// copy of a default output, so a consumer mutating a received value cannot change the default
const copyOutput = (output: IInteractivityValue): IInteractivityValue =>
    ({value: Array.isArray(output.value) ? output.value.slice() : output.value, type: output.type});

export class Receive extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = {event: {}}
    _defaultValues: Record<string, IInteractivityValue> = {};
    // declared event values: type index as declared and its resolved type name
    _valueTypes: Map<string, {type: any, typeName: string}> = new Map();

    _event: number;
    _eventRefOutput: { value: string[]; type: number };
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "CustomEventReceiveNode";
        this.validateValues(this.values);
        this.validateConfigurations(this.configuration);

        const {event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));
        this._event = event[0];
        this._eventRefOutput = { value: [`/extensions/KHR_interactivity/events/${this._event + 2}`], type: this.getTypeIndex('ref') };

        this.setUpEventListener();
    }

    setUpEventListener() {
        const {event} = this.evaluateAllConfigurations(Object.keys(this.REQUIRED_CONFIGURATIONS));

        const customEventDesc: IInteractivityEvent = this.events[event[0]];

        const defaultValues: Record<string, IInteractivityValue> = {};
        Object.entries(customEventDesc.values ?? {}).forEach(([key, value]) => {
            const typeName = this.getType(value.type);
            let defaultVal = this.getDefaultValueForType(typeName);
            if (value.value) {
                // if there is a given default value in the CE then use that
                defaultVal = value.value;
            }
            defaultValues[key] = {
                value: defaultVal,
                type: value.type,
            }
            this._valueTypes.set(key, {type: value.type, typeName});
        });
        defaultValues.event = this._eventRefOutput;
        this._defaultValues = defaultValues;
        this.outValues = this.defaultOutputs({});

        this.graphEngine.addCustomEventListener(getCustomEventChannel(customEventDesc, event[0]), (e: any) => {
            if (this.graphEngine.isEventPropagationCancelled(this._eventRefOutput.value[0])) {
                return;
            }

            this.graphEngine.processNodeStarted(this);

            const ce = (e as CustomEvent).detail as { [key: string]: any };
            // values missing from the event fall back to their defaults
            const outValues = this.defaultOutputs(ce);
            for (const ceKey in ce) {
                const declared = this._valueTypes.get(ceKey);
                if (declared === undefined) {
                    throw new Error(`Event value ${ceKey} is not declared on event ${customEventDesc.name ?? customEventDesc.id ?? `#${event[0]}`}`);
                }
                outValues[ceKey] = {
                    value: this.parseType(declared.typeName, [ce[ceKey]]),
                    type: declared.type
                }
            }
            this.outValues = outValues;
            super.processNode();
        })
    }

    private defaultOutputs(provided: Record<string, any>): Record<string, IInteractivityValue> {
        const outputs: Record<string, IInteractivityValue> = {};
        for (const key in this._defaultValues) {
            if (!(key in provided)) {
                outputs[key] = copyOutput(this._defaultValues[key]);
            }
        }
        return outputs;
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
                return this.parseMaybeJSON(val[0]);
            case "float3x3":
                return this.parseMaybeJSON(val[0]);
            case "float4x4":
                return this.parseMaybeJSON(val[0]);
            default:
                return val
        }
    }

    parseMaybeJSON(input: any): any {
        try {
            let inputCopy = input;
            if (typeof input === "string") {
                inputCopy = JSON.parse(input);
            }

            // Create copy of array, otherwise use JSON.parse for copying objects.
            // This avoids issues with Float32Array that are parsed incorrectly via the JSON functions.
            if (inputCopy.slice) {
                inputCopy = inputCopy.slice(0);
            } else {
                inputCopy = JSON.parse(JSON.stringify(inputCopy));
            }
            return inputCopy;
        } catch (e) {
            throw new Error("Error while parsing JSON in event/receive");
        }
      }
}
