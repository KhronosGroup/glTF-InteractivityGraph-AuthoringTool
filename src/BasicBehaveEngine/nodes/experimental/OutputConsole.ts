import {BehaveEngineNode, IBehaviourNodeProps} from "../../BehaveEngineNode";

export class OutputConsole extends BehaveEngineNode {
    REQUIRED_VALUES = {message: {}}

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "OutputConsole";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        this.graphEngine.clearValueEvaluationCache();

        const {message} = this.evaluateAllValues(Object.keys(this.REQUIRED_VALUES));
        const typeIndex = this.values['message'].type!


        this.graphEngine.processNodeStarted(this);

        switch (typeIndex) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5: {
                console.log(`ADBE/outputConsole: ${message}`);
                break;
            }
            case 6:
            case 7:
            case 8: {
                let matrixString = '';
                for (let col = 0; col < message[0].length; col++) {
                    matrixString += '[ ';
                    for (let row = 0; row < message.length; row++) {
                        matrixString += message[row][col];
                        if (row < message.length - 1) {
                            matrixString += ', ';
                        }
                    }
                    matrixString += ' ]';
                    if (col < message[0].length - 1) {
                        matrixString += '\n';
                    }
                }
                console.log(`ADBE/outputConsole: ${matrixString}`);
                break;
            }
            default: {
                console.log(`ADBE/outputConsole: ${message}`);
                break;
            }
        }

        super.processNode(flowSocket);
    }
}
