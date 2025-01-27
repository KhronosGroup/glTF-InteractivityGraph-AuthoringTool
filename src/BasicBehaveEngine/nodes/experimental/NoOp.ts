import { IInteractivityValue } from "../../../types/InteractivityGraph";
import { BehaveEngineNode, IBehaviourNodeProps } from "../../BehaveEngineNode";

export class NoOpNode extends BehaveEngineNode {
    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "NoOp";
        const outValues: Record<string, IInteractivityValue> = {};

        Object.entries(this.declaration.outputValueSockets || {}).forEach(([key, value]) => {
            const typeName = this.getType(value.type);
            const defaultValue = this.getDefualtValueForType(typeName);
            outValues[key] = { value: defaultValue, type: value.type };
        });
        this.outValues = outValues;
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.processNodeStarted(this);
        // no-op
    }
}