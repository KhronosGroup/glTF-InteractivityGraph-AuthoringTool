import {BasicBehaveEngine} from "./BasicBehaveEngine";

export interface IFlow {
    id: string,
    value?: any
    node?: number,
    socket?: string
}

export interface IConfiguration {
    id: string,
    value?: any
}

export interface IVariable {
    id: string,
    value?: any,
    initialValue: any
}

export interface IValue {
    id: string;
    value?: any
    node?: number,
    socket?: string,
    type?: number
}

export interface ICustomEvent {
    id: string,
    values: IValue[]
}

export interface IBehaviourNodeProps {
    graphEngine: BasicBehaveEngine,
    idToBehaviourNodeMap: Map<number, BehaveEngineNode>
    flows: IFlow[];
    values: IValue[];
    variables: IVariable[];
    customEvents: ICustomEvent[],
    types: any[]
    configuration: IConfiguration[];
    addEventToWorkQueue: any
}

export class BehaveEngineNode {
    REQUIRED_VALUES: IValue[] = [];
    REQUIRED_FLOWS: IFlow[] = [];
    REQUIRED_CONFIGURATIONS: IConfiguration[] = [];

    name: string | undefined;
    world: any;
    graphEngine: BasicBehaveEngine;
    idToBehaviourNodeMap: Map<number, BehaveEngineNode>
    flows: Record<string, IFlow>;
    values: Record<string, IValue>;
    outValues: Record<string, any>
    variables: IVariable[];
    types: any[];
    customEvents: ICustomEvent[];
    configuration: Record<string, IConfiguration>;
    addEventToWorkQueue: any;

    constructor(props: IBehaviourNodeProps) {
        const {flows, values, idToBehaviourNodeMap, graphEngine, variables, customEvents, types, configuration, addEventToWorkQueue} = props;
        this.idToBehaviourNodeMap = idToBehaviourNodeMap;
        this.graphEngine = graphEngine;
        this.variables = variables;
        this.types = types;
        this.customEvents = customEvents;
        this.values = {};
        this.flows = {};
        this.configuration = {};
        this.outValues = {};
        this.addEventToWorkQueue = addEventToWorkQueue;

        // turn array of values, flows and configurations into JSON objects for name based accessing
        if (values) {
            values.forEach((val: IValue) => {
                this.values[val.id] = val;
            })
        }

        if (flows) {
            flows.forEach((flow: IFlow) => {
                this.flows[flow.id] = flow;
            })
        }

        if (configuration) {
            configuration.forEach((configuration: IConfiguration) => {
                this.configuration[configuration.id] = configuration
            })
        }
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
    public processFlow(flow: IFlow) {
        if (flow === undefined || flow.node === undefined) {return}
        const nextNode: BehaveEngineNode | undefined = this.idToBehaviourNodeMap.get(flow.node);

        if (nextNode === undefined) {return}
        this.graphEngine.processExecutingNextNode(flow);
        nextNode.processNode();
    }


    /**
     * Validates the presence of required values.
     * @param values - An object containing values to be validated.
     * @throws An error if a required value is missing.
     */
    protected validateValues(values: any) {
        this.REQUIRED_VALUES.forEach(requiredValue => {
            if (values == null || values[requiredValue.id] == null) {
                const err = `Required Value ${requiredValue.id} is missing for ${this.name}`
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
    protected validateConfigurations(configurations: any) {
        this.REQUIRED_CONFIGURATIONS.forEach(requiredConfiguration => {
            if (configurations == null || configurations[requiredConfiguration.id] == null) {
                const err = `Required Configuration ${requiredConfiguration.id} is missing and no default value was provided for ${this.name}`;
                console.error(err);
                throw new Error(err);
            }
        });
    }

    /**
     * Validates the presence of required flows.
     * @param flows - An object containing flows to be validated.
     * @throws An error if a required flow is missing.
     */
    protected validateFlows(flows: any) {
        this.REQUIRED_FLOWS.forEach(requiredFlow => {
            if (flows[requiredFlow.id] == null) {
                const err = `Required Flow ${requiredFlow.id} is missing for ${this.name}`;
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
            res[vals[i]] = this.evaluateValue(this.values[vals[i]]);
        }
        return res;
    }

    private evaluateValue(val: IValue): any {
        if (val.value != null) {
            const typeName = this.getType(val.type!);
            return this.parseType(typeName, val.value);
        } else if (val.node != null) {

            // short circuit if we have evaluated this node's socket already
            const cachedValue = this.graphEngine.getValueEvaluationCacheValue(`${val.node}-${val.socket}`);
            if (cachedValue !== undefined) {
                this.values[val.id] = {...this.values[val.id], type: cachedValue.type};
                return cachedValue.value;
            }

            // the value depends on the output of another node's socket, so we need to go and determine that
            const dependentNode: BehaveEngineNode = this.idToBehaviourNodeMap.get(val.node)!;

            let valueToReturn: any;
            let typeIndex: number;
            if (dependentNode.outValues !== undefined && dependentNode.outValues[val.socket!] !== undefined) {
                //socket has already been evaluated so return it
                valueToReturn = dependentNode.outValues[val.socket!].value;
                typeIndex = dependentNode.outValues[val.socket!].type;
                this.values[val.id] = {...this.values[val.id], type: typeIndex};
            } else {
                //this node has not been evaluated yet, so we need to process it in order to get the output
                const dependentNodeValues = dependentNode.processNode();
                const dependentValue = dependentNodeValues[val.socket!];
                if (dependentValue === undefined) {
                    console.log(this.values);
                    console.log(val.socket!);
                    console.log(dependentNodeValues);
                }

                typeIndex = dependentValue.type
                valueToReturn = dependentValue.value
                this.values[val.id] = {...this.values[val.id], type: dependentValue.type};
            }
            this.graphEngine.addEntryToValueEvaluationCache(`${val.node}-${val.socket}`, {id: val.socket!, value: valueToReturn, type: typeIndex});
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

    private evaluateConfiguration(configuration: IConfiguration): any {
        return configuration.value;
    }
}
