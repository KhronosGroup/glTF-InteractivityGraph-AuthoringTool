import { jest } from '@jest/globals';
import {BasicBehaveEngine} from "../src/BasicBehaveEngine/BasicBehaveEngine";
import {LoggingDecorator} from "../src/BasicBehaveEngine/decorators/LoggingDecorator";
import {IBehaveEngine} from "../src/BasicBehaveEngine/IBehaveEngine";
import {BabylonDecorator} from "../src/BasicBehaveEngine/decorators/BabylonDecorator";
import {Scene} from "@babylonjs/core/scene";
import {Engine, NullEngine, Vector3} from "@babylonjs/core";


describe('BehaveEngine', () => {
    let loggingBehaveEngine: IBehaveEngine;
    let babylonBehaveEngine: IBehaveEngine;
    let executionLog: string;

    beforeAll(() => {
        executionLog = "";
    });

    beforeEach(() => {
        executionLog = "";
    })


    it('should execute behavior graph queue', async () => {
        const behaviorGraph = {
            "nodes": [
                {
                    "id": 3,
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "float3ToSend",
                            "type": 3,
                            "value": "[1,2,3]"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": "1"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1617.59375",
                        "positionY": "540.609375"
                    }
                },
                {
                    "id": 2,
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "number",
                            "value": 1,
                            "type": 1
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": "0"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1536.59375",
                        "positionY": "112.609375"
                    }
                },
                {
                    "id": 1,
                    "type": "flow/sequence",
                    "values": [],
                    "configuration": [
                        {
                            "id": "numberOutputFlows",
                            "value": "2"
                        }
                    ],
                    "flows": [
                        {
                            "id": "0",
                            "node": 2,
                            "socket": "in"
                        },
                        {
                            "id": "1",
                            "node": 3,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "903.59375",
                        "positionY": "320.609375"
                    }
                },
                {
                    "id": 0,
                    "type": "lifecycle/onStart",
                    "values": [],
                    "configuration": [],
                    "flows": [
                        {
                            "id": "out",
                            "node": 1,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "510.59375",
                        "positionY": "347.609375"
                    }
                }
            ],
            "variables": [],
            "customEvents": [
                {
                    "id": "log",
                    "values": [
                        {
                            "id": "number",
                            "type": 1,
                            "description": ""
                        }
                    ]
                },
                {
                    "id": "logTwo",
                    "values": [
                        {
                            "id": "float3ToSend",
                            "type": 3,
                            "description": ""
                        }
                    ]
                }
            ],
            "types": [
                {
                    "signature": "bool"
                },
                {
                    "signature": "int"
                },
                {
                    "signature": "float"
                },
                {
                    "signature": "float3"
                }
            ]
        };

        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, {});
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(executionLog).toEqual("Adding {\"node\":0,\"id\":\"start\"} flow to queueRunning OnStart: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":1,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":1,\"socket\":\"in\"} flowRunning Sequence: input values: {}, output flows: {\"0\":{\"id\":\"0\",\"node\":2,\"socket\":\"in\"},\"1\":{\"id\":\"1\",\"node\":3,\"socket\":\"in\"}}Executing {\"id\":\"0\",\"node\":2,\"socket\":\"in\"} flowRunning Send: input values: {\"number\":{\"id\":\"number\",\"value\":1,\"type\":1}}, output flows: {}Executing {\"id\":\"1\",\"node\":3,\"socket\":\"in\"} flowRunning Send: input values: {\"float3ToSend\":{\"id\":\"float3ToSend\",\"type\":3,\"value\":\"[1,2,3]\"}}, output flows: {}");
    });

    it('should execute behavior graph queue', async () => {
        const behaviorGraph = {
            "nodes": [
                {
                    "id": 9,
                    "type": "world/get",
                    "values": [],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/translation"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1869.6851257404824",
                        "positionY": "-116.80364277896092"
                    }
                },
                {
                    "id": 10,
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "float3ToLog",
                            "node": 9,
                            "socket": "value"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": "0"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "2362.8544812335363",
                        "positionY": "-464.7354210879766"
                    }
                },
                {
                    "id": 7,
                    "type": "world/get",
                    "values": [],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/rotation"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1671.7789766105834",
                        "positionY": "-769.5747314412886"
                    }
                },
                {
                    "id": 8,
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "float3ToLog",
                            "node": 7,
                            "socket": "value"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": "0"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "2238.3651293615035",
                        "positionY": "-858.9517020160816"
                    }
                },
                {
                    "id": 2,
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "value": "[1.57,0,0]",
                            "type": 4
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/rotation"
                        }
                    ],
                    "flows": [
                        {
                            "id": "out",
                            "node": 8,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "1469.0847754856063",
                        "positionY": "-1186.1352550130919"
                    }
                },
                {
                    "id": 3,
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "value": "[10,20,30]",
                            "type": 4
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/translation"
                        }
                    ],
                    "flows": [
                        {
                            "id": "out",
                            "node": 10,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "1462.7007061588354",
                        "positionY": "-297.68228200136275"
                    }
                },
                {
                    "id": 1,
                    "type": "flow/sequence",
                    "values": [],
                    "configuration": [
                        {
                            "id": "numberOutputFlows",
                            "value": "3"
                        }
                    ],
                    "flows": [
                        {
                            "id": "2",
                            "node": 4,
                            "socket": "in"
                        },
                        {
                            "id": "1",
                            "node": 3,
                            "socket": "in"
                        },
                        {
                            "id": "0",
                            "node": 2,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "489.1301338262689",
                        "positionY": "-450.8999458438651"
                    }
                },
                {
                    "id": 5,
                    "type": "world/get",
                    "values": [],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/scale"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "804.59375",
                        "positionY": "582.609375"
                    }
                },
                {
                    "id": 6,
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "float3ToLog",
                            "node": 5,
                            "socket": "value"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": "0"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1589.1812856653175",
                        "positionY": "478.7743975698712"
                    }
                },
                {
                    "id": 4,
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "value": "[4,5,6]",
                            "type": 4
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/scale"
                        }
                    ],
                    "flows": [
                        {
                            "id": "out",
                            "node": 6,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "994.0560897785188",
                        "positionY": "31.90807512304505"
                    }
                },
                {
                    "id": 0,
                    "type": "lifecycle/onStart",
                    "values": [],
                    "configuration": [],
                    "flows": [
                        {
                            "id": "out",
                            "node": 1,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "54.44864077166517",
                        "positionY": "-358.06924570662386"
                    }
                }
            ],
            "variables": [],
            "customEvents": [
                {
                    "id": "log",
                    "values": [
                        {
                            "id": "float3ToLog",
                            "type": 4,
                            "description": ""
                        }
                    ]
                }
            ],
            "types": [
                {
                    "signature": "bool"
                },
                {
                    "signature": "int"
                },
                {
                    "signature": "float"
                },
                {
                    "signature": "float2"
                },
                {
                    "signature": "float3"
                },
                {
                    "signature": "float4"
                },
                {
                    "signature": "float4x4"
                }
            ]
        };

        const loggingWorld = {
            "nodes":[
                {"scale":[1,2,3], "translation": [0,0,0], "rotation": [0, 3.14, -1.57]}
            ]
        }
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, loggingWorld);
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(loggingWorld.nodes[0].scale).toEqual([4,5,6]);
        expect(loggingWorld.nodes[0].translation).toEqual([10,20,30]);
        expect(loggingWorld.nodes[0].rotation).toEqual([1.57,0,0]);
        expect(executionLog).toEqual("Adding {\"node\":0,\"id\":\"start\"} flow to queueRunning OnStart: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":1,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":1,\"socket\":\"in\"} flowRunning Sequence: input values: {}, output flows: {\"0\":{\"id\":\"0\",\"node\":2,\"socket\":\"in\"},\"1\":{\"id\":\"1\",\"node\":3,\"socket\":\"in\"},\"2\":{\"id\":\"2\",\"node\":4,\"socket\":\"in\"}}Executing {\"id\":\"0\",\"node\":2,\"socket\":\"in\"} flowRunning WorldSet: input values: {\"a\":{\"id\":\"a\",\"value\":\"[1.57,0,0]\",\"type\":4}}, output flows: {\"out\":{\"id\":\"out\",\"node\":8,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":8,\"socket\":\"in\"} flowRunning WorldGet: input values: {}, output flows: {}Running Send: input values: {\"float3ToLog\":{\"id\":\"float3ToLog\",\"node\":7,\"socket\":\"value\",\"type\":4}}, output flows: {}Executing {\"id\":\"1\",\"node\":3,\"socket\":\"in\"} flowRunning WorldSet: input values: {\"a\":{\"id\":\"a\",\"value\":\"[10,20,30]\",\"type\":4}}, output flows: {\"out\":{\"id\":\"out\",\"node\":10,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":10,\"socket\":\"in\"} flowRunning WorldGet: input values: {}, output flows: {}Running Send: input values: {\"float3ToLog\":{\"id\":\"float3ToLog\",\"node\":9,\"socket\":\"value\",\"type\":4}}, output flows: {}Executing {\"id\":\"2\",\"node\":4,\"socket\":\"in\"} flowRunning WorldSet: input values: {\"a\":{\"id\":\"a\",\"value\":\"[4,5,6]\",\"type\":4}}, output flows: {\"out\":{\"id\":\"out\",\"node\":6,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":6,\"socket\":\"in\"} flowRunning WorldGet: input values: {}, output flows: {}Running Send: input values: {\"float3ToLog\":{\"id\":\"float3ToLog\",\"node\":5,\"socket\":\"value\",\"type\":4}}, output flows: {}");
        const babylonWorld = {
            "glTFNodes":[
                {"scaling":new Vector3(1,2,3), "position": new Vector3(0,0,0), "rotation": new Vector3(0, 3.14, -1.57)}
            ]
        }
        const engine: Engine = new NullEngine()
        const mockScene: Scene = new Scene(engine)
        babylonBehaveEngine = new BabylonDecorator(new BasicBehaveEngine(1), babylonWorld, mockScene);
        babylonBehaveEngine.loadBehaveGraph(behaviorGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(babylonWorld.glTFNodes[0].scaling).toEqual(new Vector3(4,5,6));
        expect(babylonWorld.glTFNodes[0].position).toEqual(new Vector3(10,20,30));
        expect(babylonWorld.glTFNodes[0].rotation).toEqual(new Vector3(1.57,0,0));
    });

    it('should not execute given invalid node type graph', async () => {
        const invalidNodeGraph = {
            "nodes": [
                {
                    "id": 2,
                    "type": "customEvent/send",
                    "values": [],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": "0"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1232.59375",
                        "positionY": "262.609375"
                    }
                },
                {
                    "id": 1,
                    "type": "invalid/node",
                    "flows": [
                        {
                            "id": "out",
                            "node": 2,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "726.59375",
                        "positionY": "144.609375"
                    }
                },
                {
                    "id": 0,
                    "type": "lifecycle/onStart",
                    "values": [],
                    "configuration": [],
                    "flows": [
                        {
                            "id": "out",
                            "node": 1,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "220.59375",
                        "positionY": "161.609375"
                    }
                }
            ],
            "variables": [],
            "customEvents": [
                {
                    "id": "dont_get_here",
                    "values": []
                }
            ],
            "types": [
                {
                    "signature": "bool"
                },
                {
                    "signature": "int"
                },
                {
                    "signature": "float"
                },
                {
                    "signature": "float3"
                }
            ]
        };

        expect(() => {loggingBehaveEngine.loadBehaveGraph(invalidNodeGraph)}).toThrow(new Error("Unrecognized node type invalid/node"));
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(executionLog).toBe("");
    });

    it("should animate property", async () => {
        const engine: Engine = new NullEngine()
        const mockScene: Scene = new Scene(engine)
        let callback: undefined;
        mockScene.registerBeforeRender = jest.fn((cb: any) => {
            callback = cb;
        })
        babylonBehaveEngine = new BabylonDecorator(new BasicBehaveEngine(1), {}, mockScene);
        babylonBehaveEngine.animateProperty("float3", "/", "linear", 1, [0,0,0], JSON.stringify([1,2,3]), () => {return})
        await new Promise((resolve) => setTimeout(resolve, 2000));

        expect(callback).not.toBeUndefined()
    })

});
