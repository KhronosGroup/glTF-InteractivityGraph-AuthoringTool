import { jest } from '@jest/globals';
import {BasicBehaveEngine} from "../src/BasicBehaveEngine/BasicBehaveEngine";
import {LoggingDecorator} from "../src/BasicBehaveEngine/decorators/LoggingDecorator";
import {IBehaveEngine} from "../src/BasicBehaveEngine/IBehaveEngine";
import {BabylonDecorator} from "../src/BasicBehaveEngine/decorators/BabylonDecorator";
import {Scene} from "@babylonjs/core/scene";
import {Engine, NullEngine, Quaternion, Vector3} from "@babylonjs/core";


describe('BehaveEngine', () => {
    let loggingBehaveEngine: IBehaveEngine;
    let babylonBehaveEngine: IBehaveEngine;


    it('should execute behavior graph queue', async () => {
        const behaviorGraph = {
            "nodes": [
                {
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
                },
                {
                    "type": "flow/sequence",
                    "values": [],
                    "configuration": [
                        {
                            "id": "numberOutputFlows",
                            "value": 2
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
                            "value": 0
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1536.59375",
                        "positionY": "112.609375"
                    }
                },
                {
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "float3ToSend",
                            "type": 3,
                            "value": [1,2,3]
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": 1
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1617.59375",
                        "positionY": "540.609375"
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

        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, {});
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(executionLog).toEqual( "Adding {\"node\":0,\"id\":\"start\"} flow to queueRunning OnStart: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":1,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":1,\"socket\":\"in\"} flowRunning Sequence: input values: {}, output flows: {\"0\":{\"id\":\"0\",\"node\":2,\"socket\":\"in\"},\"1\":{\"id\":\"1\",\"node\":3,\"socket\":\"in\"}}Executing {\"id\":\"0\",\"node\":2,\"socket\":\"in\"} flowRunning Send: input values: {\"number\":{\"id\":\"number\",\"value\":1,\"type\":1}}, output flows: {}Executing {\"id\":\"1\",\"node\":3,\"socket\":\"in\"} flowRunning Send: input values: {\"float3ToSend\":{\"id\":\"float3ToSend\",\"type\":3,\"value\":[1,2,3]}}, output flows: {}");
    });

    it('should execute behavior graph queue', async () => {
        const behaviorGraph = {
            "nodes": [
                {
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
                },
                {
                    "type": "flow/sequence",
                    "values": [],
                    "configuration": [
                        {
                            "id": "numberOutputFlows",
                            "value": 3
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
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "value": [1.57,0,0,1],
                            "type": 5
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
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "value": [10,20,30],
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
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "value": [4,5,6],
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
                            "value": 0
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1589.1812856653175",
                        "positionY": "478.7743975698712"
                    }
                },
                {
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
                            "value": 0
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "2238.3651293615035",
                        "positionY": "-858.9517020160816"
                    }
                },
                {
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
                            "value": 0
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "2362.8544812335363",
                        "positionY": "-464.7354210879766"
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
                {"scale":[1,2,3], "translation": [0,0,0], "rotation": [0, 0, 0, 0]}
            ]
        }
        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, loggingWorld);
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(loggingWorld.nodes[0].scale).toEqual([4,5,6]);
        expect(loggingWorld.nodes[0].translation).toEqual([10,20,30]);
        expect(loggingWorld.nodes[0].rotation).toEqual([1.57,0,0,1]);
        expect(executionLog).toEqual("Adding {\"node\":0,\"id\":\"start\"} flow to queueRunning OnStart: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":1,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":1,\"socket\":\"in\"} flowRunning Sequence: input values: {}, output flows: {\"0\":{\"id\":\"0\",\"node\":2,\"socket\":\"in\"},\"1\":{\"id\":\"1\",\"node\":3,\"socket\":\"in\"},\"2\":{\"id\":\"2\",\"node\":4,\"socket\":\"in\"}}Executing {\"id\":\"0\",\"node\":2,\"socket\":\"in\"} flowRunning WorldSet: input values: {\"a\":{\"id\":\"a\",\"value\":[1.57,0,0,1],\"type\":5}}, output flows: {\"out\":{\"id\":\"out\",\"node\":8,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":8,\"socket\":\"in\"} flowRunning WorldGet: input values: {}, output flows: {}Running Send: input values: {\"float3ToLog\":{\"id\":\"float3ToLog\",\"node\":7,\"socket\":\"value\",\"type\":5}}, output flows: {}Executing {\"id\":\"1\",\"node\":3,\"socket\":\"in\"} flowRunning WorldSet: input values: {\"a\":{\"id\":\"a\",\"value\":[10,20,30],\"type\":4}}, output flows: {\"out\":{\"id\":\"out\",\"node\":10,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":10,\"socket\":\"in\"} flowRunning WorldGet: input values: {}, output flows: {}Running Send: input values: {\"float3ToLog\":{\"id\":\"float3ToLog\",\"node\":9,\"socket\":\"value\",\"type\":4}}, output flows: {}Executing {\"id\":\"2\",\"node\":4,\"socket\":\"in\"} flowRunning WorldSet: input values: {\"a\":{\"id\":\"a\",\"value\":[4,5,6],\"type\":4}}, output flows: {\"out\":{\"id\":\"out\",\"node\":6,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":6,\"socket\":\"in\"} flowRunning WorldGet: input values: {}, output flows: {}Running Send: input values: {\"float3ToLog\":{\"id\":\"float3ToLog\",\"node\":5,\"socket\":\"value\",\"type\":4}}, output flows: {}");
        const babylonWorld = {
            "glTFNodes":[
                {"scaling":new Vector3(1,2,3), "position": new Vector3(0,0,0), "rotationQuaternion": new Quaternion(0, 0, 0, 0)}
            ]
        }
        const engine: Engine = new NullEngine()
        const mockScene: Scene = new Scene(engine)
        babylonBehaveEngine = new BabylonDecorator(new BasicBehaveEngine(1), babylonWorld, mockScene);
        babylonBehaveEngine.loadBehaveGraph(behaviorGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(babylonWorld.glTFNodes[0].scaling).toEqual(new Vector3(4,5,6));
        expect(babylonWorld.glTFNodes[0].position).toEqual(new Vector3(10,20,30));
        expect(babylonWorld.glTFNodes[0].rotationQuaternion).toEqual(new Quaternion(0,0,1, 1.57));
    });

    it('should not execute given invalid node type graph', async () => {
        const invalidNodeGraph = {
            "nodes": [
                {
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
                },
                {
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

        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, {});
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
        babylonBehaveEngine = new BabylonDecorator(new BasicBehaveEngine(1), {glTFNodes: []}, mockScene);
        babylonBehaveEngine.animateProperty("/",  {initialValue: 0, targetValue: 10, easingType: 2}, () => {return})
        await new Promise((resolve) => setTimeout(resolve, 2000));

        expect(callback).not.toBeUndefined()
    })

    it("should do math graph", async () => {
        const mathExampleNodeGraph = {
            "nodes": [
                {
                    "type": "lifecycle/onStart",
                    "values": [],
                    "configuration": [],
                    "flows": [
                        {
                            "id": "out",
                            "node": 4,
                            "socket": "in"
                        }
                    ]
                },
                {
                    "type": "math/dot",
                    "values": [
                        {
                            "id": "a",
                            "value": [10,10,10],
                            "type": 4
                        },
                        {
                            "id": "b",
                            "value": [1,2,3],
                            "type": 4
                        }
                    ],
                    "configuration": [],
                    "flows": []
                },
                {
                    "type": "math/mul",
                    "values": [
                        {
                            "id": "b",
                            "value": 2,
                            "type": 2
                        },
                        {
                            "id": "a",
                            "node": 1,
                            "socket": "val"
                        }
                    ],
                    "configuration": [],
                    "flows": []
                },
                {
                    "type": "math/sub",
                    "values": [
                        {
                            "id": "b",
                            "value": 78,
                            "type": 2
                        },
                        {
                            "id": "a",
                            "node": 2,
                            "socket": "val"
                        }
                    ],
                    "configuration": [],
                    "flows": []
                },
                {
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "outFloat",
                            "node": 3,
                            "socket": "val"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": "0"
                        }
                    ],
                    "flows": []
                },

            ],
            "variables": [],
            "customEvents": [
                {
                    "id": "MyCustomMath",
                    "values": [
                        {
                            "id": "outFloat",
                            "type": 2,
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
                }
            ]
        };

        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, {});
        loggingBehaveEngine.addCustomEventListener("KHR_INTERACTIVITY:MyCustomMath", (e:any) => {
            expect(e.detail.outFloat).toEqual(42)
        })
        loggingBehaveEngine.loadBehaveGraph(mathExampleNodeGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(executionLog).toEqual("Adding {\"node\":0,\"id\":\"start\"} flow to queueRunning OnStart: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":4,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":4,\"socket\":\"in\"} flowRunning DotNode: input values: {\"a\":{\"id\":\"a\",\"value\":[10,10,10],\"type\":4},\"b\":{\"id\":\"b\",\"value\":[1,2,3],\"type\":4}}, output flows: {}Running MultiplyNode: input values: {\"b\":{\"id\":\"b\",\"value\":2,\"type\":2},\"a\":{\"id\":\"a\",\"node\":1,\"socket\":\"val\",\"type\":2}}, output flows: {}Running SubtractNode: input values: {\"b\":{\"id\":\"b\",\"value\":78,\"type\":2},\"a\":{\"id\":\"a\",\"node\":2,\"socket\":\"val\",\"type\":2}}, output flows: {}Running Send: input values: {\"outFloat\":{\"id\":\"outFloat\",\"node\":3,\"socket\":\"val\",\"type\":2}}, output flows: {}");
    });

    it("should do world pointer operations", async () => {
        const worldPointerGraph = {
            "nodes": [
                {
                    "type": "lifecycle/onStart",
                    "values": [],
                    "configuration": [],
                    "flows": [
                        {
                            "id": "out",
                            "node": 1,
                            "socket": "in"
                        }
                    ]
                },
                {
                    "type": "flow/sequence",
                    "values": [],
                    "configuration": [
                        {
                            "id": "numberOutputFlows",
                            "value": 2
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
                            "node": 6,
                            "socket": "in"
                        }
                    ]
                },
                {
                    "type": "world/animateTo",
                    "values": [
                        {
                            "id": "a",
                            "value": [5,5,5],
                            "type": 4
                        },
                        {
                            "id": "easingDuration",
                            "value": 0.1,
                            "type": 2
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/scale"
                        },
                        {
                            "id": "easingType",
                            "value": 2
                        }
                    ],
                    "flows": [
                        {
                            "id": "done",
                            "node": 3,
                            "socket": "in"
                        }
                    ]
                },
                {
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "value": [1,1,1],
                            "type": 4
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/scale"
                        }
                    ],
                    "flows": []
                },
                {
                    "type": "world/get",
                    "values": [
                        {
                            "id": "nodeIndex",
                            "value": 0,
                            "type": 1
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/{nodeIndex}/translation"
                        }
                    ],
                    "flows": []
                },
                {
                    "type": "math/add",
                    "values": [
                        {
                            "id": "b",
                            "value": [0,5,0],
                            "type": 4
                        },
                        {
                            "id": "a",
                            "node": 4,
                            "socket": "value"
                        }
                    ],
                    "configuration": [],
                    "flows": []
                },
                {
                    "type": "world/animateTo",
                    "values": [
                        {
                            "id": "nodeIndex",
                            "value": 0,
                            "type": 1
                        },
                        {
                            "id": "a",
                            "node": 5,
                            "socket": "val"
                        },
                        {
                            "id": "easingDuration",
                            "value": 0.1,
                            "type": 2
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/{nodeIndex}/translation"
                        },
                        {
                            "id": "easingType",
                            "value": 2
                        }
                    ],
                    "flows": []
                }
            ],
            "variables": [],
            "customEvents": [],
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
                }
            ]
        }

        const loggingWorld = {
            "nodes":[
                {"scale":[1,2,3], "translation": [0,-2,0], "rotation": [0, 3.14, -1.57]}
            ]
        }

        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, loggingWorld);
        loggingBehaveEngine.loadBehaveGraph(worldPointerGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(loggingWorld.nodes[0].scale).toEqual([1,1,1]);
        expect(loggingWorld.nodes[0].translation).toEqual([0,3,0]);
        expect(executionLog).toEqual("Adding {\"node\":0,\"id\":\"start\"} flow to queueRunning OnStart: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":1,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":1,\"socket\":\"in\"} flowRunning Sequence: input values: {}, output flows: {\"0\":{\"id\":\"0\",\"node\":2,\"socket\":\"in\"},\"1\":{\"id\":\"1\",\"node\":6,\"socket\":\"in\"}}Executing {\"id\":\"0\",\"node\":2,\"socket\":\"in\"} flowRunning WorldAnimateTo: input values: {\"a\":{\"id\":\"a\",\"value\":[5,5,5],\"type\":4},\"easingDuration\":{\"id\":\"easingDuration\",\"value\":0.1,\"type\":2}}, output flows: {\"done\":{\"id\":\"done\",\"node\":3,\"socket\":\"in\"}}Executing {\"id\":\"1\",\"node\":6,\"socket\":\"in\"} flowRunning WorldGet: input values: {\"nodeIndex\":{\"id\":\"nodeIndex\",\"value\":0,\"type\":1}}, output flows: {}Running AddNode: input values: {\"b\":{\"id\":\"b\",\"value\":[0,5,0],\"type\":4},\"a\":{\"id\":\"a\",\"node\":4,\"socket\":\"value\",\"type\":4}}, output flows: {}Running WorldAnimateTo: input values: {\"nodeIndex\":{\"id\":\"nodeIndex\",\"value\":0,\"type\":1},\"a\":{\"id\":\"a\",\"node\":5,\"socket\":\"val\",\"type\":4},\"easingDuration\":{\"id\":\"easingDuration\",\"value\":0.1,\"type\":2}}, output flows: {}Adding {\"id\":\"done\",\"node\":3,\"socket\":\"in\"} flow to queueRunning WorldSet: input values: {\"a\":{\"id\":\"a\",\"value\":[1,1,1],\"type\":4}}, output flows: {}");
    });

    it("should tick 5 times", async () => {
        const tickGraph = {
            "nodes": [
                {
                    "type": "lifecycle/onTick",
                    "values": [],
                    "configuration": [],
                    "flows": [
                        {
                            "id": "out",
                            "node": 1,
                            "socket": "in"
                        }
                    ]
                },
                {
                    "type": "flow/doN",
                    "values": [
                        {
                            "id": "n",
                            "value": 5,
                            "type": 1
                        }
                    ],
                    "configuration": [
                        {
                            "id": "startCount",
                            "value": 0
                        }
                    ],
                    "flows": [
                        {
                            "id": "out",
                            "node": 4,
                            "socket": "in"
                        }
                    ]
                },
                {
                    "type": "world/get",
                    "values": [],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/translation"
                        }
                    ],
                    "flows": []
                },
                {
                    "type": "math/add",
                    "values": [
                        {
                            "id": "b",
                            "value": [0,0.25,0],
                            "type": 4
                        },
                        {
                            "id": "a",
                            "node": 2,
                            "socket": "value"
                        }
                    ],
                    "configuration": [],
                    "flows": []
                },
                {
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "node": 3,
                            "socket": "val"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/translation"
                        }
                    ],
                    "flows": []
                }
            ],
            "variables": [],
            "customEvents": [],
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
                }
            ]
        };

        const loggingWorld = {
            "nodes":[
                {"scale":[1,2,3], "translation": [0,0,0], "rotation": [0, 3.14, -1.57]}
            ]
        }

        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 30), (line:string) => executionLog += line, loggingWorld);
        loggingBehaveEngine.loadBehaveGraph(tickGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(loggingWorld.nodes[0].translation).toEqual([0,1.25,0]);
    });

    it("should send and receive custom events", async () => {
        const customEventGraph = {
            "nodes": [
                {
                    "type": "customEvent/receive",
                    "values": [],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": 0
                        }
                    ],
                    "flows": [
                        {
                            "id": "out",
                            "node": 1,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "334.55482355488107",
                        "positionY": "328.8151290670574"
                    }
                },
                {
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "node": 0,
                            "socket": "scaleVector"
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
                            "node": 2,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "917.5250874879636",
                        "positionY": "367.1374079694366"
                    }
                },
                {
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "success",
                            "value": true,
                            "type": 0
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": 1
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1488.0654625305283",
                        "positionY": "327.50249727444015"
                    }
                }
            ],
            "variables": [],
            "customEvents": [
                {
                    "id": "triggerScale",
                    "values": [
                        {
                            "id": "scaleVector",
                            "type": 4,
                            "description": ""
                        }
                    ]
                },
                {
                    "id": "scaleComplete",
                    "values": [
                        {
                            "id": "success",
                            "type": 0,
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
                }
            ]
        };

        const loggingWorld = {
            "nodes":[
                {"scale":[1,2,3], "translation": [0,0,0], "rotation": [0, 3.14, -1.57]}
            ]
        }

        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, loggingWorld);
        loggingBehaveEngine.addCustomEventListener("KHR_INTERACTIVITY:scaleComplete", (e:any) => {
            expect(e.detail.success).toEqual(true)
        })
        loggingBehaveEngine.loadBehaveGraph(customEventGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        loggingBehaveEngine.emitCustomEvent("KHR_INTERACTIVITY:triggerScale", {scaleVector: "[10,10,10]"});
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(loggingWorld.nodes[0].scale).toEqual([10,10,10]);
        expect(executionLog).toEqual("Running CustomEventReceiveNode: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":1,\"socket\":\"in\"}}Adding {\"id\":\"out\",\"node\":1,\"socket\":\"in\"} flow to queueRunning WorldSet: input values: {\"a\":{\"id\":\"a\",\"node\":0,\"socket\":\"scaleVector\",\"type\":4}}, output flows: {\"out\":{\"id\":\"out\",\"node\":2,\"socket\":\"in\"}}Executing {\"id\":\"out\",\"node\":2,\"socket\":\"in\"} flowRunning Send: input values: {\"success\":{\"id\":\"success\",\"value\":true,\"type\":0}}, output flows: {}");
    });

    it("should get and set variables", async () => {
        const variablesGraph = {
            "nodes": [
                {
                    "type": "customEvent/receive",
                    "values": [],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": 0
                        }
                    ],
                    "flows": [
                        {
                            "id": "out",
                            "node": 3,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "-7",
                        "positionY": "439"
                    }
                },
                {
                    "type": "variable/get",
                    "values": [],
                    "configuration": [
                        {
                            "id": "variable",
                            "value": 0
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "251.59375",
                        "positionY": "124.609375"
                    }
                },
                {
                    "type": "math/add",
                    "values": [
                        {
                            "id": "b",
                            "node": 0,
                            "socket": "toAdd"
                        },
                        {
                            "id": "a",
                            "node": 1,
                            "socket": "cum"
                        }
                    ],
                    "configuration": [],
                    "flows": [],
                    "metadata": {
                        "positionX": "922",
                        "positionY": "231"
                    }
                },
                {
                    "type": "variable/set",
                    "values": [
                        {
                            "id": "cum",
                            "node": 2,
                            "socket": "val"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "variable",
                            "value": 0
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1262",
                        "positionY": "423"
                    }
                },
                {
                    "type": "customEvent/receive",
                    "values": [],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": 2
                        }
                    ],
                    "flows": [
                        {
                            "id": "out",
                            "node": 5,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "501.59375",
                        "positionY": "-274.390625"
                    }
                },
                {
                    "type": "customEvent/send",
                    "values": [
                        {
                            "id": "sum",
                            "node": 1,
                            "socket": "cum"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "customEvent",
                            "value": 1
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1427.59375",
                        "positionY": "-217.390625"
                    }
                }
            ],
            "variables": [
                {
                    "id": "cum",
                    "value": 0,
                    "type": 2
                }
            ],
            "customEvents": [
                {
                    "id": "MyAdd",
                    "values": [
                        {
                            "id": "toAdd",
                            "type": 2,
                            "description": ""
                        }
                    ]
                },
                {
                    "id": "mySum",
                    "values": [
                        {
                            "id": "sum",
                            "type": 2,
                            "description": ""
                        }
                    ]
                },
                {
                    "id": "triggerSum",
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
                    "signature": "float2"
                },
                {
                    "signature": "float3"
                }
            ]
        };

        const loggingWorld = {
            "nodes":[
                {"scale":[1,2,3], "translation": [0,0,0], "rotation": [0, 3.14, -1.57]}
            ]
        }

        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, loggingWorld);
        loggingBehaveEngine.addCustomEventListener("KHR_INTERACTIVITY:scaleComplete", (e:any) => {
            expect(e.detail.sum).toEqual(15)
        })
        loggingBehaveEngine.loadBehaveGraph(variablesGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        loggingBehaveEngine.emitCustomEvent("KHR_INTERACTIVITY:MyAdd", {toAdd: 8});
        await new Promise((resolve) => setTimeout(resolve, 250));
        loggingBehaveEngine.emitCustomEvent("KHR_INTERACTIVITY:MyAdd", {toAdd: 7});
        await new Promise((resolve) => setTimeout(resolve, 250));
        loggingBehaveEngine.emitCustomEvent("KHR_INTERACTIVITY:triggerSum", {});
        expect(executionLog).toEqual("Running CustomEventReceiveNode: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":3,\"socket\":\"in\"}}Adding {\"id\":\"out\",\"node\":3,\"socket\":\"in\"} flow to queueRunning VariableGetNode: input values: {}, output flows: {}Running AddNode: input values: {\"b\":{\"id\":\"b\",\"node\":0,\"socket\":\"toAdd\",\"type\":2},\"a\":{\"id\":\"a\",\"node\":1,\"socket\":\"cum\",\"type\":2}}, output flows: {}Running VariableSet: input values: {\"cum\":{\"id\":\"cum\",\"node\":2,\"socket\":\"val\",\"type\":2}}, output flows: {}Running CustomEventReceiveNode: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":3,\"socket\":\"in\"}}Adding {\"id\":\"out\",\"node\":3,\"socket\":\"in\"} flow to queueRunning VariableGetNode: input values: {}, output flows: {}Running AddNode: input values: {\"b\":{\"id\":\"b\",\"node\":0,\"socket\":\"toAdd\",\"type\":2},\"a\":{\"id\":\"a\",\"node\":1,\"socket\":\"cum\",\"type\":2}}, output flows: {}Running VariableSet: input values: {\"cum\":{\"id\":\"cum\",\"node\":2,\"socket\":\"val\",\"type\":2}}, output flows: {}Running CustomEventReceiveNode: input values: {}, output flows: {\"out\":{\"id\":\"out\",\"node\":5,\"socket\":\"in\"}}Adding {\"id\":\"out\",\"node\":5,\"socket\":\"in\"} flow to queueRunning VariableGetNode: input values: {}, output flows: {}Running Send: input values: {\"sum\":{\"id\":\"sum\",\"node\":1,\"socket\":\"cum\",\"type\":2}}, output flows: {}");
    });

    it("should re-evaluate condition each loop iteration", async () => {
        const whileLoopGraph = {
            "nodes": [
                {
                    "type": "math/random",
                    "values": [],
                    "configuration": [],
                    "flows": [],
                    "metadata": {
                        "positionX": "560.1142272949219",
                        "positionY": "335.1455383300781"
                    }
                },
                {
                    "type": "math/lt",
                    "values": [
                        {
                            "id": "b",
                            "value": 0.99,
                            "type": 2
                        },
                        {
                            "id": "a",
                            "node": 0,
                            "socket": "val"
                        }
                    ],
                    "configuration": [],
                    "flows": [],
                    "metadata": {
                        "positionX": "933.708984375",
                        "positionY": "253.6966552734375"
                    }
                },
                {
                    "type": "lifecycle/onStart",
                    "values": [],
                    "configuration": [],
                    "flows": [
                        {
                            "id": "out",
                            "node": 3,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "471.46063232421875",
                        "positionY": "-152.34808349609375"
                    }
                },
                {
                    "type": "flow/whileLoop",
                    "values": [
                        {
                            "id": "condition",
                            "node": 1,
                            "socket": "val"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "isDo",
                            "value": false
                        }
                    ],
                    "flows": [
                        {
                            "id": "loopBody",
                            "node": 7,
                            "socket": "in"
                        },
                        {
                            "id": "completed",
                            "node": 4,
                            "socket": "in"
                        }
                    ],
                    "metadata": {
                        "positionX": "1239.6684875488281",
                        "positionY": "36.449499511718756"
                    }
                },
                {
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "value": [
                                5,
                                6,
                                7
                            ],
                            "type": 4
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/translation"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1798.1705923629859",
                        "positionY": "303.1538526143007"
                    }
                },
                {
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
                        "positionX": "56.85950927734393",
                        "positionY": "637.0478820800781"
                    }
                },
                {
                    "type": "math/mul",
                    "values": [
                        {
                            "id": "b",
                            "value": [
                                1.01,
                                1.01,
                                1.01
                            ],
                            "type": 4
                        },
                        {
                            "id": "a",
                            "node": 5,
                            "socket": "value"
                        }
                    ],
                    "configuration": [],
                    "flows": [],
                    "metadata": {
                        "positionX": "647.7160034179688",
                        "positionY": "564.9638977050781"
                    }
                },
                {
                    "type": "world/set",
                    "values": [
                        {
                            "id": "a",
                            "node": 6,
                            "socket": "val"
                        }
                    ],
                    "configuration": [
                        {
                            "id": "path",
                            "value": "nodes/0/scale"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "1813.3783294677733",
                        "positionY": "-36.328094482421875"
                    }
                }
            ],
            "variables": [],
            "customEvents": [],
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
                }
            ]
        };

        const loggingWorld = {
            "nodes":[
                {"scale":[1,1,1], "translation": [0,0,0], "rotation": [0, 3.14, -1.57]}
            ]
        }

        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(new BasicBehaveEngine( 1), (line:string) => executionLog += line, loggingWorld);
        loggingBehaveEngine.loadBehaveGraph(whileLoopGraph);
        await new Promise((resolve) => setTimeout(resolve, 250));
        expect(loggingWorld.nodes[0].translation).toEqual([5,6,7]);
        expect(loggingWorld.nodes[0].scale[0]).toBeGreaterThan(1);
    });
});
