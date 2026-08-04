import { IInteractivityValue } from "../../types/InteractivityGraph";
import { BehaveEngineNode, IBehaviourNodeProps } from "../../BehaveEngineNode";
import { registerNoOpNode } from "./noOpRegistry";

export class NoOpNode extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        registerNoOpNode(this);
        this.name = `NoOp (unsupported op "${this.declaration.op}")`;
        const outValues: Record<string, IInteractivityValue> = {};

        Object.entries(this.declaration.outputValueSockets || {}).forEach(([key, value]) => {
            const typeName = this.getType(value.type);
            const defaultValue = this.getDefaultValueForType(typeName);
            outValues[key] = { value: defaultValue, type: value.type };
        });
        this.outValues = outValues;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        // no-op
    }
}