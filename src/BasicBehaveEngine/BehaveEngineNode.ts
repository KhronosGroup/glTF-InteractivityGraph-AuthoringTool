import { IInteractivityConfigurationValue, IInteractivityDeclaration, IInteractivityEvent, IInteractivityFlow, IInteractivityValue, IInteractivityValueType, IInteractivityVariable } from "./types/InteractivityGraph";
import {BasicBehaveEngine} from "./BasicBehaveEngine";
import { isNoOpNode } from "./nodes/experimental/noOpRegistry";
import { CompiledPathTemplate, compilePathTemplate, fillPathTemplate, parsePathTemplate } from "./pointerTemplate";
import { IJsonPtrEntry } from "./IBehaveEngine";

export interface IBehaviourNodeProps {
    index: number,
    graphEngine: BasicBehaveEngine,
    idToBehaviourNodeMap: Map<number, BehaveEngineNode>
    declaration: IInteractivityDeclaration,
    flows: Record<string, IInteractivityFlow>;
    values: Record<string, IInteractivityValue>;
    variables: IInteractivityVariable[];
    events: IInteractivityEvent[],
    types:IInteractivityValueType[],
    configuration: Record<string, IInteractivityConfigurationValue>,
    addEventToWorkQueue: any,
}

// type names per graph `types` array, shared by all nodes of a graph
const typeNameCache = new WeakMap<IInteractivityValueType[], string[]>();

const typeSignatureName = (type: IInteractivityValueType): string =>
    type?.signature === "custom" && type?.extensions ? Object.keys(type.extensions)[0] : type.signature;

const LITERAL_INPUT = 0;
const CONNECTED_INPUT = 1;
const DEFAULT_INPUT = 2;

// an input socket resolved on first evaluation; reused while the node still holds the same socket object
interface PreparedInput {
    source: IInteractivityValue;
    kind: number;
    // literal: the socket value/type the parsed value was made from
    rawValue: any[] | undefined;
    rawType: number | undefined;
    parsed: any;
    // type name of typeIndex; for connected inputs typeIndex follows the source output's type
    typeIndex: number | undefined;
    typeName: string;
    node: BehaveEngineNode | undefined;
    socket: string;
}

const warnIfSingleElementArray = (val: any) => {
    if (Array.isArray(val) && val.length === 1) {
        console.error("This should not happen – an array with a single value was returned");
    }
};

export class BehaveEngineNode {
    REQUIRED_VALUES: Record<string, IInteractivityValue> = {};
    REQUIRED_CONFIGURATIONS: Record<string, IInteractivityConfigurationValue> = {};
    // input flow socket ids of the operation; empty for value and event operations
    INPUT_FLOWS: string[] = [];
    index: number;
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
    // all outputs of the last processNode() pull, valid while the engine's evaluation epoch is unchanged
    private outputCache: Record<string, IInteractivityValue> | undefined;
    private outputCacheEpoch = -1;
    private typeNameList: string[] | undefined;
    private typeNameSource: IInteractivityValueType[] | undefined;
    private preparedInputs: Map<string, PreparedInput> | undefined;
    private requiredValueKeys: string[] | undefined;
    private requiredValueKeysSource: Record<string, IInteractivityValue> | undefined;
    private compiledPointer: CompiledPathTemplate | undefined;
    private compiledPointerSource: string | undefined;

    constructor(props: IBehaviourNodeProps) {
        const {index, flows, values, idToBehaviourNodeMap, graphEngine, variables, events, types, configuration, addEventToWorkQueue, declaration} = props;
        this.index = index;
        this.idToBehaviourNodeMap = idToBehaviourNodeMap;
        this.graphEngine = graphEngine;
        this.variables = variables;
        this.types = types;
        this.events = events;
        this.values = values;
        this.flows = flows;
        this.configuration = configuration;
        this.outValues = {};
        this.addEventToWorkQueue = (flow: IInteractivityFlow) => {
            const nextNode = flow?.node === undefined ? undefined : this.idToBehaviourNodeMap.get(Number(flow.node));
            if (nextNode !== undefined && !nextNode.INPUT_FLOWS.includes(flow.socket ?? "in")) {return}
            addEventToWorkQueue(flow);
        };
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
        // spec: a flow to an input socket the target does not have is unconnected
        if (nextNode === undefined || !nextNode.INPUT_FLOWS.includes(flow.socket ?? "in")) {return}
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
        let isMissingConfigs = false;
        Object.entries(this.REQUIRED_CONFIGURATIONS).forEach(([key, value]) => {
            if (configurations[key] == null) {
                if (value.defaultValue == null) {
                    const err = `Required Configuration ${key} is missing and there is no default value provided for ${this.name}`;
                    console.error(err);
                    throw new Error(err);
                } else {
                    configurations[key] = {value: value.defaultValue};
                    isMissingConfigs = true;
                }
            }
        });
        if (isMissingConfigs) {
            Object.entries(this.REQUIRED_CONFIGURATIONS).forEach(([key, value]) => {
                configurations[key] = {value: value.defaultValue};
            });
        }

        // spec: value validation (type, range, allowed values) is done by each node, which falls back to its default configuration
    }

    /**
     * Evaluates all values based on their definitions.
     * @param vals - An array of value names to be evaluated.
     * @returns An object containing the evaluated values.
     */
    protected evaluateAllValues(vals: string[]): Record<string, any> {
        const res: Record<string, any> = {};
        for (let i = 0; i < vals.length; i++) {
            res[vals[i]] = this.evaluateValue(vals[i], this.values[vals[i]]);
        }
        return res;
    }

    /** evaluateAllValues over the keys of REQUIRED_VALUES. */
    protected evaluateRequiredValues(): Record<string, any> {
        if (this.requiredValueKeysSource !== this.REQUIRED_VALUES) {
            this.requiredValueKeys = Object.keys(this.REQUIRED_VALUES);
            this.requiredValueKeysSource = this.REQUIRED_VALUES;
        }
        return this.evaluateAllValues(this.requiredValueKeys!);
    }

    private evaluateValue(key: string, val: IInteractivityValue): any {
        if (val === undefined) {
            throw new Error(`Value ${key} is missing for ${this.name}`);
        }

        let input = this.preparedInputs === undefined ? undefined : this.preparedInputs.get(key);
        if (input === undefined || input.source !== val
            || (input.kind === LITERAL_INPUT && (val.value !== input.rawValue || val.type !== input.rawType))) {
            input = this.prepareInput(key, val);
            if (input === undefined) {
                return undefined;
            }
        }

        if (input.kind === LITERAL_INPUT) {
            return input.parsed;
        }
        if (input.kind === CONNECTED_INPUT) {
            const output = this.pullOutput(input.node!, input.socket);
            const type = output.type;
            input.source.type = type;
            if (type !== input.typeIndex) {
                input.typeIndex = type;
                input.typeName = this.getType(type!);
                const result = this.parseType(input.typeName, output.value);
                warnIfSingleElementArray(result);
                return result;
            }
            return this.parseType(input.typeName, output.value);
        }
        // spec: neither value nor node -> type-default value
        return this.parseType(input.typeName, this.getDefaultValueForType(input.typeName));
    }

    private prepareInput(key: string, val: IInteractivityValue): PreparedInput | undefined {
        let input: PreparedInput;
        if (val.value != null) {
            const typeName = this.getType(val.type!);
            const parsed = this.parseType(typeName, val.value);
            warnIfSingleElementArray(parsed);
            input = {source: val, kind: LITERAL_INPUT, rawValue: val.value, rawType: val.type, parsed, typeIndex: val.type, typeName, node: undefined, socket: ""};
        } else if (val.node != null) {
            // evaluation writes the resolved type into the socket; write into a copy, not the caller's object
            const source = {...val};
            this.values[key] = source;
            const node = this.idToBehaviourNodeMap.get(Number(val.node))!;
            input = {source, kind: CONNECTED_INPUT, rawValue: undefined, rawType: undefined, parsed: undefined, typeIndex: undefined, typeName: "", node, socket: val.socket!};
        } else if (val.type != null) {
            input = {source: val, kind: DEFAULT_INPUT, rawValue: undefined, rawType: undefined, parsed: undefined, typeIndex: val.type, typeName: this.getType(val.type), node: undefined, socket: ""};
        } else {
            return undefined;
        }
        if (this.preparedInputs === undefined) {
            this.preparedInputs = new Map();
        }
        this.preparedInputs.set(key, input);
        return input;
    }

    // output of another node's socket: this epoch's cached result, then its stored outValues, else process it
    private pullOutput(dependentNode: BehaveEngineNode, socket: string): IInteractivityValue {
        if (dependentNode.outputCacheEpoch === this.graphEngine.valueEvaluationEpoch) {
            const cached = dependentNode.outputCache![socket];
            if (cached !== undefined) {
                return cached;
            }
        }

        const stored = dependentNode.outValues === undefined ? undefined : dependentNode.outValues[socket];
        if (stored !== undefined) {
            return stored;
        }

        const outputs = dependentNode.processNode();
        if (outputs === undefined || outputs[socket] === undefined) {
            if (isNoOpNode(dependentNode)) {
                throw new Error(`"${this.name}" depends on output socket "${socket}" of "${dependentNode.name}", which does not execute or produce output because this tool does not implement its operation.`);
            }
            throw new Error(`Output socket ${socket} is missing on ${dependentNode.name}`);
        }
        dependentNode.outputCache = outputs;
        dependentNode.outputCacheEpoch = this.graphEngine.valueEvaluationEpoch;
        return outputs[socket];
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

    private typeNames(): string[] {
        let names = this.typeNameList;
        if (names === undefined || this.typeNameSource !== this.types || names.length !== this.types.length) {
            names = typeNameCache.get(this.types);
            if (names === undefined || names.length !== this.types.length) {
                names = this.types.map(typeSignatureName);
                typeNameCache.set(this.types, names);
            }
            this.typeNameList = names;
            this.typeNameSource = this.types;
        }
        return names;
    }

    protected getType(id: number): string {
        const name = this.typeNames()[id];
        if (name === undefined) {
            console.log(id)
            console.log(this.types)
            return typeSignatureName(this.types[id]);
        }
        return name;
    }

    protected getTypeIndex(name: string): number {
        return this.typeNames().indexOf(name);
    }

    protected getDefaultValueForType(type: string): any {
        switch (type) {
            case "ref":
                return [null];
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
            case "float2x2":
                return [NaN, NaN, NaN, NaN];
            case "float3x3":
                return [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN];
            case "float4x4":
                return [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN];
            default:
                console.error(`No default value for type ${type} returning NaN which is probably not valid`);
                return [NaN];
        }
    }

    protected parseType(type: string, val: any) {
        const scalarValue = Array.isArray(val) ? val[0] : val;
        switch (type) {
            case "bool":
                return scalarValue === "true" || scalarValue === true;
            case "int":
                return Number(scalarValue);
            case "float":
                return Number(scalarValue);
            case "float2":
                return val;
            case "float3":
                return val;
            case "float4":
                return val;
            case "float4x4":
                return val;
            case "ref":
                // spec: a ref literal that cannot be resolved is a null reference; "" is the document root, never an object
                return scalarValue === "" ? null : scalarValue;
            default:
                return val
        }
    }

    private evaluateConfiguration(configuration: IInteractivityConfigurationValue): any {
        return configuration.value;
    }

    // Resolve a "#/..."-style JSON pointer ref down to its trailing id.
    protected resolveRef = (ref: string | null): number => {
        if (ref == null || ref === "") {
            return -1;
        }
        // last non-empty "/" segment
        const str = String(ref);
        let end = str.length;
        while (end > 0 && str.charCodeAt(end - 1) === 47) {
            end--;
        }
        return end === 0 ? -1 : Number(str.slice(str.lastIndexOf("/", end - 1) + 1, end));
    }

    protected populatePath(path: string, refs: Record<string, string>, indices: Record<string, string>): string {
        if (this.compiledPointerSource !== path) {
            this.compiledPointer = compilePathTemplate(path);
            this.compiledPointerSource = path;
        }
        const template = this.compiledPointer!;
        if (template.length === 1) {
            return template[0] as string;
        }
        return fillPathTemplate(template, ({id, kind}) => {
            if (kind === "index") {
                return String(indices[id]);
            }
            const index = this.resolveRef(refs[id]);
            if (index === -1) {
                throw new Error(`Invalid reference value for ${id}: ${refs[id]}`);
            }
            return index.toString();
        });
    }

    // spec pointer/set + pointer/interpolate steps 2-4: negative index, null ref, unresolvable,
    // type mismatch or immutable property -> undefined (caller activates err)
    protected resolveWritablePointer(pointer: string, refs: Record<string, string>, indices: Record<string, string>, typeName: string): {path: string, entry: IJsonPtrEntry} | undefined {
        for (const id in indices) {
            if (Number(indices[id]) < 0) {
                return undefined;
            }
        }
        for (const id in refs) {
            if (this.resolveRef(refs[id]) === -1) {
                return undefined;
            }
        }
        const path = this.populatePath(pointer, refs, indices);
        const entry = this.graphEngine.resolveJsonPtr(path);
        if (entry === undefined || entry.typeName !== typeName || entry.readOnly) {
            return undefined;
        }
        return {path, entry};
    }

    protected parsePathRefVariables(path: string): string[] {
        return this.parsePathTemplateSockets(path, "ref");
    }

    protected parsePathIndexVariables(path: string): string[] {
        return this.parsePathTemplateSockets(path, "index");
    }

    // spec: an invalid pointer template makes the node invalid and the graph must be rejected
    private parsePathTemplateSockets(path: string, kind: "index" | "ref"): string[] {
        const {valid, sockets} = parsePathTemplate(path);
        if (!valid) {
            throw new Error(`Invalid JSON pointer template: ${path}`);
        }
        return sockets.filter(socket => socket.kind === kind).map(socket => socket.id);
    }
}
