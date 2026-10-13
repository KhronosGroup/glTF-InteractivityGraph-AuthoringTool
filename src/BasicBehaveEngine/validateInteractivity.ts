import {
    INTERACTIVITY_SCHEMAS,
    OPERATION_SCHEMAS,
} from "./generated/interactivitySchemas";
import { parsePathTemplate } from "./pointerTemplate";
import { parseMessageTemplate } from "./messageTemplate";

const own = (value: object, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(value, key);
function fail(message: string): never {
    throw new Error(`Invalid KHR_interactivity: ${message}`);
}
const object = (value: unknown): value is Record<string, any> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

// The checked-in Khronos schemas use this subset of JSON Schema 2020-12. Keep the
// validation rules intact so structural validation follows the specification, not fixtures.
function matches(value: any, schema: any, root: any = schema): boolean {
    if (schema === true) return true;
    if (schema === false) return false;
    if (schema.$ref) {
        const [file, fragment] = schema.$ref.split("#");
        const referencedRoot = file ? INTERACTIVITY_SCHEMAS[file] : root;
        if (!referencedRoot) fail(`unresolved schema ${schema.$ref}`);
        const referenced = fragment
            ? fragment
                  .slice(1)
                  .split("/")
                  .reduce((node: any, key: string) => node[key], referencedRoot)
            : referencedRoot;
        if (!matches(value, referenced, referencedRoot)) return false;
    }
    if (schema.type) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (
            !types.some((type: string) =>
                type === "object"
                    ? object(value)
                    : type === "array"
                      ? Array.isArray(value)
                      : type === "integer"
                        ? Number.isInteger(value)
                        : type === "null"
                          ? value === null
                          : typeof value === type,
            )
        )
            return false;
    }
    if (own(schema, "const") && value !== schema.const) return false;
    if (schema.enum && !schema.enum.includes(value)) return false;
    if (
        schema.allOf &&
        !schema.allOf.every((part: any) => matches(value, part, root))
    )
        return false;
    if (
        schema.anyOf &&
        !schema.anyOf.some((part: any) => matches(value, part, root))
    )
        return false;
    if (
        schema.oneOf &&
        schema.oneOf.filter((part: any) => matches(value, part, root))
            .length !== 1
    )
        return false;
    if (schema.not && matches(value, schema.not, root)) return false;
    if (
        typeof value === "number" &&
        (value < (schema.minimum ?? -Infinity) ||
            value > (schema.maximum ?? Infinity))
    )
        return false;
    if (
        typeof value === "string" &&
        (value.length < (schema.minLength ?? 0) ||
            (schema.pattern && !new RegExp(schema.pattern).test(value)))
    )
        return false;
    if (Array.isArray(value)) {
        if (
            value.length < (schema.minItems ?? 0) ||
            value.length > (schema.maxItems ?? Infinity)
        )
            return false;
        if (
            schema.items &&
            !value.every((item) => matches(item, schema.items, root))
        )
            return false;
        if (
            schema.uniqueItems &&
            new Set(value.map((item) => JSON.stringify(item))).size !==
                value.length
        )
            return false;
    }
    if (object(value)) {
        if ((schema.required ?? []).some((key: string) => !own(value, key)))
            return false;
        if (Object.keys(value).length < (schema.minProperties ?? 0))
            return false;
        for (const [key, entry] of Object.entries(value)) {
            if (schema.properties && own(schema.properties, key)) {
                if (!matches(entry, schema.properties[key], root)) return false;
            } else if (
                schema.additionalProperties !== undefined &&
                !matches(entry, schema.additionalProperties, root)
            )
                return false;
            if (
                (schema.dependentRequired?.[key] ?? []).some(
                    (dependency: string) => !own(value, dependency),
                )
            )
                return false;
        }
    }
    return true;
}

export function validateInteractivityExtension(extension: unknown): void {
    // Non-default graphs may be invalid without invalidating the default graph.
    if (
        !object(extension) ||
        !Array.isArray(extension.graphs) ||
        extension.graphs.length === 0
    )
        fail("graphs must be a nonempty array");
    const index = extension.graph === undefined ? 0 : extension.graph;
    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= extension.graphs.length
    )
        fail("default graph index is out of range");
    validateInteractivityGraph(extension.graphs[index]);
}

export function validateInteractivityGraph(graph: any): void {
    if (
        !matches(
            graph,
            INTERACTIVITY_SCHEMAS["graph.KHR_interactivity.schema.json"],
        )
    )
        fail("graph does not match the Khronos JSON schema");
    const types: any[] = graph.types ?? [];
    const variables: any[] = graph.variables ?? [];
    const events: any[] = graph.events ?? [];
    const declarations: any[] = graph.declarations ?? [];
    const nodes: any[] = graph.nodes ?? [];
    const index = (value: any, length: number, label: string): number => {
        if (!Number.isInteger(value) || value < 0 || value >= length)
            fail(`${label} index is out of range`);
        return value;
    };
    const signature = (value: any): string =>
        types[index(value, types.length, "type")].signature;
    const literal = (entry: any): string => {
        const type = signature(entry.type);
        if (entry.value === undefined || type === "custom") return type;
        const count: Record<string, number> = {
            bool: 1,
            int: 1,
            float: 1,
            float2: 2,
            float3: 3,
            float4: 4,
            float2x2: 4,
            float3x3: 9,
            float4x4: 16,
            ref: 1,
        };
        if (entry.value.length !== count[type])
            fail(`wrong component count for ${type}`);
        for (const value of entry.value) {
            if (type === "bool") {
                if (typeof value !== "boolean")
                    fail("bool value must be boolean");
            } else if (type === "int") {
                if (
                    !Number.isInteger(value) ||
                    value < -2147483648 ||
                    value > 2147483647
                )
                    fail("int value must be int32");
            } else if (type === "ref") {
                if (
                    value !== null &&
                    (typeof value !== "string" ||
                        (value !== "" && !value.startsWith("/")) ||
                        /~(?:[^01]|$)/.test(value))
                )
                    fail("invalid JSON pointer reference");
            } else if (
                typeof value !== "number" &&
                !["NaN", "Infinity", "-Infinity"].includes(value)
            )
                fail("float component must be numeric");
        }
        return type;
    };
    const unique = (values: any[], label: string): void => {
        if (new Set(values).size !== values.length) fail(`duplicate ${label}`);
    };
    unique(
        types
            .filter((type) => type.signature !== "custom")
            .map((type) => type.signature),
        "type signatures",
    );
    variables.forEach(literal);
    unique(
        events
            .filter((event) => event.id !== undefined)
            .map((event) => event.id),
        "event ids",
    );
    for (const event of events)
        for (const [id, value] of Object.entries(event.values ?? {})) {
            if (id === "event") fail("reserved event socket id");
            literal(value);
        }
    unique(
        declarations.map((declaration) =>
            JSON.stringify([declaration.op, declaration.extension ?? ""]),
        ),
        "declarations",
    );
    for (const declaration of declarations) {
        if (!declaration.extension) {
            if (
                !OPERATION_SCHEMAS[declaration.op] ||
                OPERATION_SCHEMAS[declaration.op].extension
            )
                fail(`unknown core operation ${declaration.op}`);
            if (declaration.inputValueSockets || declaration.outputValueSockets)
                fail("core declaration cannot redefine sockets");
        }
        for (const socket of Object.values(declaration.inputValueSockets ?? {}))
            literal(socket);
        for (const socket of Object.values(
            declaration.outputValueSockets ?? {},
        ))
            literal(socket);
    }
    const outputs: Array<Record<string, string>> = [];
    nodes.forEach((node, nodeIndex) => {
        const declaration =
            declarations[
                index(node.declaration, declarations.length, "declaration")
            ];
        const op = declaration.op;
        // Extension operations have exactly the value sockets their declaration defines.
        const spec = declaration.extension ? undefined : OPERATION_SCHEMAS[op];
        const inputs: Record<string, string> = {};
        for (const [id, source] of Object.entries<any>(node.values ?? {})) {
            if (source.node !== undefined) {
                const ref = index(source.node, nodeIndex, "input node");
                const socket = source.socket ?? "value";
                const type = outputs[ref][socket];
                if (!type)
                    fail(
                        `node ${nodeIndex} input ${id} references output socket ${socket} not defined by node ${ref}`,
                    );
                if (
                    source.type !== undefined &&
                    signature(source.type) !== type
                )
                    fail("wired input type does not match output");
                inputs[id] = type;
            } else inputs[id] = literal(source);
        }
        for (const flow of Object.values<any>(node.flows ?? {})) {
            index(flow.node, nodes.length, "flow node");
            if (flow.node <= nodeIndex)
                fail("output flow must point to a later node");
        }
        const config = (key: string): any[] | undefined =>
            node.configuration?.[key]?.value;
        const requireType = (key: string, allowed?: string[]): string => {
            const type = inputs[key];
            if (!type || (allowed && !allowed.includes(type)))
                fail(`invalid or missing ${op} input ${key}`);
            return type;
        };
        const groups: Record<string, string> = {};
        for (const [key, socket] of Object.entries(spec?.inputs ?? {})) {
            const type = requireType(key, socket.types);
            if (socket.group) {
                if (groups[socket.group] && groups[socket.group] !== type)
                    fail(`inconsistent ${op} type group ${socket.group}`);
                groups[socket.group] = type;
            }
        }
        if (!spec)
            for (const [key, socket] of Object.entries<any>(
                declaration.inputValueSockets ?? {},
            ))
                requireType(key, [signature(socket.type)]);
        const output: Record<string, string> = {};
        for (const [key, socket] of Object.entries(spec?.outputs ?? {}))
            output[key] = socket.group
                ? (groups[socket.group] ?? socket.types[0])
                : socket.types[0];
        if (!spec)
            for (const [key, socket] of Object.entries<any>(
                declaration.outputValueSockets ?? {},
            ))
                output[key] = signature(socket.type);
        if (spec && op.startsWith("variable/")) {
            const ids =
                op === "variable/set"
                    ? config("variables")
                    : config("variable");
            if (!ids?.length) fail(`missing ${op} variable configuration`);
            for (const id of ids) index(id, variables.length, "variable");
            const type = signature(variables[ids[0]].type);
            if (op === "variable/get") output.value = type;
            if (op === "variable/set")
                for (const id of ids)
                    requireType(String(id), [signature(variables[id].type)]);
            if (op === "variable/interpolate") {
                requireType("value", [type]);
                if (!type.startsWith("float"))
                    fail("variable interpolation requires a float type");
                const slerp = config("useSlerp");
                if (
                    !slerp ||
                    slerp.length !== 1 ||
                    typeof slerp[0] !== "boolean" ||
                    (slerp[0] && type !== "float4")
                )
                    fail("invalid useSlerp");
            }
        }
        if (spec && (op === "event/send" || op === "event/receive")) {
            const id = config("event")?.[0];
            const event = events[index(id, events.length, "event")];
            for (const [key, socket] of Object.entries<any>(
                event.values ?? {},
            )) {
                if (op === "event/send")
                    requireType(key, [signature(socket.type)]);
                else output[key] = signature(socket.type);
            }
        }
        if (spec && op.startsWith("pointer/")) {
            const pointer = config("pointer");
            if (
                !pointer ||
                pointer.length !== 1 ||
                typeof pointer[0] !== "string"
            )
                fail("invalid pointer configuration");
            const parsed = parsePathTemplate(pointer[0]);
            if (!parsed.valid) fail("invalid pointer template");
            const type = signature(config("type")?.[0]);
            for (const socket of parsed.sockets) {
                if (
                    (op === "pointer/set" && socket.id === "value") ||
                    (op === "pointer/interpolate" &&
                        ["value", "duration", "p1", "p2"].includes(socket.id))
                )
                    fail("reserved pointer socket id");
                requireType(socket.id, [
                    socket.kind === "index" ? "int" : "ref",
                ]);
            }
            if (op === "pointer/get") output.value = type;
            else requireType("value", [type]);
            if (op === "pointer/interpolate" && !type.startsWith("float"))
                fail("pointer interpolation requires a float type");
        }
        if (spec && op === "math/switch") {
            const type = requireType("default");
            const cases = config("cases") ?? [];
            // Invalid int32 configurations use the empty default, as in MathSwitch.
            if (cases.every((value) => value === (value | 0))) {
                for (const value of new Set(cases))
                    requireType(String(value), [type]);
            }
            output.value = type;
        }
        if (spec && op === "debug/log") {
            const message = config("message")?.[0];
            if (typeof message === "string")
                for (const parameter of parseMessageTemplate(message) ?? [])
                    requireType(parameter.id);
        }
        outputs.push(output);
    });
}
