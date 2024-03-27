import {behaveToAuthor} from "../src/authoring/BehaveToAuthor";
import {authorToBehave} from "../src/authoring/AuthorToBehave";


describe("authoring", () => {
    it("should do a round trip from behave to author back to behave", () => {
        const exampleGraph = {
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
                        "positionX": "301.59375",
                        "positionY": "209.609375"
                    }
                },
                {
                    "type": "pointer/set",
                    "values": [
                        {
                            "id": "nodeIndex",
                            "value": 0,
                            "type": 1
                        },
                        {
                            "id": "val",
                            "value": [1,2,3],
                            "type": 3
                        }
                    ],
                    "configuration": [
                        {
                            "id": "pointer",
                            "value": "/nodes/{nodeIndex}/translation"
                        }
                    ],
                    "flows": [],
                    "metadata": {
                        "positionX": "837.59375",
                        "positionY": "126.609375"
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
                },
                {
                    "signature": "float4"
                },
                {
                    "signature": "float4x4"
                },
                {
                    "signature": "custom",
                    "extensions": {
                        "AMZN_interactivity_string": {}
                    }
                }
            ]
        };

        const authorGraph = behaveToAuthor(JSON.stringify(exampleGraph));
        expect(authorGraph[0].length).toBe(2);
        expect(authorGraph[1].length).toBe(1);

        const backToBehave = authorToBehave(authorGraph[0], authorGraph[1], authorGraph[2], authorGraph[3]);
        expect(backToBehave).toEqual(exampleGraph)
    })

})
