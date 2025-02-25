import { IInteractivityConfigurationValue, IInteractivityDeclaration, IInteractivityEvent, IInteractivityFlow, IInteractivityValue, IInteractivityValueType, IInteractivityVariable } from "../types/InteractivityGraph";
import {BasicBehaveEngine} from "./BasicBehaveEngine";

export interface IBehaviourNodeProps {
    graphEngine: BasicBehaveEngine,
    idToBehaviourNodeMap: Map<number, BehaveEngineNode>
    declaration: IInteractivityDeclaration,
    flows: Record<string, IInteractivityFlow>;
    values: Record<string, IInteractivityValue>;
    variables: IInteractivityVariable[];
    events: IInteractivityEvent[],
    types:IInteractivityValueType[],
    configuration: Record<string, IInteractivityConfigurationValue>,
    addEventToWorkQueue: any
}

export class BehaveEngineNode {
    REQUIRED_VALUES: Record<string, IInteractivityValue> = {};
    REQUIRED_CONFIGURATIONS: Record<string, IInteractivityConfigurationValue> = {};

    name: string | undefined;
    world: any;
    graphEngine: BasicBehaveEngine;
    idToBehaviourNodeMap: Map<number, BehaveEngineNode>
    flows: Record<string, IInteractivityFlow>;
    values: Record<string, IInteractivityValue>;
    outValues: Record<string, IInteractivityValue>;
    declaration: IInteractivityDeclaration;
    variables: IInteractivityVariable[];
    types: IInteractivityValueType[];
    events: IInteractivityEvent[];
    configuration: Record<string, IInteractivityConfigurationValue>;
    addEventToWorkQueue: any;

    constructor(props: IBehaviourNodeProps) {
        const {flows, values, idToBehaviourNodeMap, graphEngine, variables, events, types, configuration, addEventToWorkQueue, declaration} = props;
        this.idToBehaviourNodeMap = idToBehaviourNodeMap;
        this.graphEngine = graphEngine;
        this.variables = variables;
        this.types = types;
        this.events = events;
        this.values = values;
        this.flows = flows;
        this.configuration = configuration;
        this.outValues = {};
        this.addEventToWorkQueue = addEventToWorkQueue;
        this.declaration = declaration;
    }

    /**
     * Initializes and returns a new BehaveEngineNode instance.
     * @param props - The properties and settings for the BehaveEngineNode.
     * @returns A new BehaveEngineNode instance.
     */
    static init(props: IBehaviourNodeProps) {
        return new this(props);
    }

    /**
     * Processes the node and its associated flow.
     * @param flowSocket - The socket associated with the flow (optional).
     */
    public processNode(flowSocket?: string): any {
        if (this.flows !== undefined && this.flows.out !== undefined) {
            this.processFlow(this.flows.out);
        }
    }

    /**
     * Processes a specific flow associated with this node.
     * @param flow - The flow object to be processed.
     */
    public processFlow(flow: IInteractivityFlow) {
        if (flow === undefined || flow.node === undefined) {return}
        const nextNode: BehaveEngineNode | undefined = this.idToBehaviourNodeMap.get(Number(flow.node));

        if (nextNode === undefined) {return}
        this.graphEngine.processExecutingNextNode(flow);
        nextNode.processNode(flow.socket);
    }


    /**
     * Validates the presence of required values.
     * @param values - An object containing values to be validated.
     * @throws An error if a required value is missing.
     */
    protected validateValues(values: Record<string, IInteractivityValue>) {
        Object.keys(this.REQUIRED_VALUES).forEach(requiredValue => {
            if (values == null || values[requiredValue] == null) {
                const err = `Required Value ${requiredValue} is missing for ${this.name}`
                console.error(err);
                throw new Error(err);
            }
        });
    }

    /**
     * Validates the presence of required configurations.
     * @param configurations - An object containing configurations to be validated.
     * @throws An error if a required configuration is missing.
     */
    protected validateConfigurations(configurations: Record<string, IInteractivityConfigurationValue>) {
        Object.keys(this.REQUIRED_CONFIGURATIONS).forEach(requiredConfiguration => {
            if (configurations == null || configurations[requiredConfiguration] == null) {
                const err = `Required Configuration ${requiredConfiguration} is missing and no default value was provided for ${this.name}`;
                console.error(err);
                throw new Error(err);
            }
        });
    }

    /**
     * Evaluates all values based on their definitions.
     * @param vals - An array of value names to be evaluated.
     * @returns An object containing the evaluated values.
     */
    protected evaluateAllValues(vals: string[]): Record<string, any> {
        const res: Record<string, any> = {};
        for (let i = 0; i < vals.length; i++) {
            const val = this.evaluateValue(vals[i], this.values[vals[i]]);
            if (Array.isArray(val) && val.length === 1) {
                console.error("This should not happen – an array with a single value was returned");
            }
            res[vals[i]] = val;
        }
        return res;
    }

    private evaluateValue(key: string, val: IInteractivityValue): any {
        if (val.value != null) {
            const typeName = this.getType(val.type!);
            return this.parseType(typeName, val.value);
        } else if (val.node != null) {

            // short circuit if we have evaluated this node's socket already
            const cachedValue = this.graphEngine.getValueEvaluationCacheValue(`${val.node}-${val.socket}`);
            if (cachedValue !== undefined) {
                this.values[key] = {...this.values[key], type: cachedValue.type};
                const typeName = this.getType(cachedValue.type!);
                return this.parseType(typeName, cachedValue.value);
            }

            // the value depends on the output of another node's socket, so we need to go and determine that
            const dependentNode: BehaveEngineNode = this.idToBehaviourNodeMap.get(Number(val.node))!;

            let valueToReturn: any;
            let typeIndex: number;
            if (dependentNode.outValues !== undefined && dependentNode.outValues[val.socket!] !== undefined) {
                //socket has already been evaluated so return it
                valueToReturn = dependentNode.outValues[val.socket!].value;
                typeIndex = dependentNode.outValues[val.socket!].type!;
                this.values[key] = {...this.values[key], type: typeIndex};
            } else {
                //this node has not been evaluated yet, so we need to process it in order to get the output
                const dependentNodeValues = dependentNode.processNode();
                const dependentValue = dependentNodeValues[val.socket!];

                typeIndex = dependentValue.type
                valueToReturn = dependentValue.value
                this.values[key] = {...this.values[key], type: dependentValue.type};
            }
            this.graphEngine.addEntryToValueEvaluationCache(`${val.node}-${val.socket}`, {socket: val.socket!, value: valueToReturn, type: typeIndex});
            const typeName = this.getType(typeIndex);
            return this.parseType(typeName, valueToReturn);
        }
    }

    /**
     * Evaluates all configurations based on their definitions.
     * @param configs - An array of configuration names to be evaluated.
     * @returns An object containing the evaluated configuration values.
     */
    protected evaluateAllConfigurations(configs: string[]): Record<string, any> {
        const res: any = {};
        for (let i = 0; i < configs.length; i++) {
            res[configs[i]] = this.evaluateConfiguration(this.configuration[configs[i]]);
        }
        return res;
    }

    protected getType(id: number): string {
        const type = this.types[id];
        let typeName: string;
        if (type.signature === "custom" && type.extensions) {
            typeName = Object.keys(type.extensions)[0]
        } else {
            typeName = type.signature;
        }

        return typeName;
    }

    protected getTypeIndex(name: string): number {
        const typeNames = this.types.map((type, index) => this.getType(index));
        return typeNames.indexOf(name);
    }

    protected getDefualtValueForType(type: string): any {
        switch (type) {
            case "bool":
                return [false];
            case "int":
                return [0];
            case "float":
                return [NaN];
            case "float2":
                return [NaN, NaN];
            case "float3":
                return [NaN, NaN, NaN];
            case "float4":
                return [NaN, NaN, NaN, NaN];
            case "float4x4":
                return [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN];
            default:
                console.error(`No default value for type ${type} returning NaN which is probably not valid`);
                return [NaN];
        }
    }

    protected parseType(type: string, val: any) {
        switch (type) {
            case "bool":
                return val[0] === "true" || val[0] === true;
            case "int":
                return Number(val[0]);
            case "float":
                return Number(val[0]);
            case "float2":
                return val;
            case "float3":
                return val;
            case "float4":
                return val;
            case "float4x4":
                return val;
            default:
                return val
        }
    }

    private evaluateConfiguration(configuration: IInteractivityConfigurationValue): any {
        return configuration.value;
    }
}
