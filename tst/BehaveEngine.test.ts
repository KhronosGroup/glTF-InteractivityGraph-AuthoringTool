import {BasicBehaveEngine} from "../src/BasicBehaveEngine/BasicBehaveEngine";
import {LoggingDecorator} from "../src/BasicBehaveEngine/decorators/LoggingDecorator";
import { DOMEventBus } from "../src/BasicBehaveEngine/eventBuses/DOMEventBus";
import {IBehaveEngine} from "../src/BasicBehaveEngine/IBehaveEngine";
import fs from "fs";

describe('BehaveEngine', () => {
    let loggingBehaveEngine: IBehaveEngine;

    it('should correctly evaluate random node', async () => {
        /**
         * This test ensures that the random evaluation occurs correctly
         * 
         * The graph sets a variable to the anded result of 
         * 
         * 1) math/eq using the same random node is true
         * 2) math/eq using different random nodes is false
         * 
         */
        const behaviorGraph = JSON.parse(fs.readFileSync("./tst/testGraphs/randomTest.json", "utf8"));

        let executionLog = "";
        const eventBus = new DOMEventBus();
        const engine = new BasicBehaveEngine(1, eventBus);
        loggingBehaveEngine = new LoggingDecorator(engine, (line:string) => executionLog += line, {});
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);

        expect(engine.variables![0].value![0]).toEqual(true);
    });

    it('should correctly evaluate pointer/get', async () => {
        /**
         * This test ensures that the pointer/get node evaluates correctly
         * 
         * The graph sets a variable to the expect the pointer/set can correcty retrieve and update a pointer value 
         * 1) pointer set gets the value of node/0/translation and adds [1,2,3] to it
         * 2) math/eq compares the pointer/get value to [2,3,4] and sets the variable to true if they are equal
         */
        const behaviorGraph = JSON.parse(fs.readFileSync("./tst/testGraphs/pointerGetSet.json", "utf8"));
        const eventBus = new DOMEventBus();
        const engine = new BasicBehaveEngine(1, eventBus);
        let executionLog = "";
        const world = {nodes:[{translation:[1,1,1]}]}
        loggingBehaveEngine = new LoggingDecorator(engine, (line:string) => executionLog += line, world);
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);

        expect(engine.variables![0].value![0]).toEqual(true);
    });

    it('should correctly evaluate pointer/interpolate', async () => {
        /**
         * This test ensures that the pointer/interpolate node evaluates correctly
         * 
         * The graph sets a variable to the expect the pointer/interpolate can correctly interpolate a pointer value and is cancelled if a pointer/set is called
         * 1) pointer/interpolate interpolates the pointer value from [0,0,0] to [1,0,0] over 2 seconds
         * 2) a delay of 1 second is activated and when it is done, a pointer/set is called to set the pointer value to whatever is currently in the pointer (cancelling the interpolation)
         * 3) a delay of another second is activated (to ensure the interpolation is cancelled) and when it is done, we compare the length of the pointer to 0.5 and set the test variable to true if it is within 0.01
         */
        const behaviorGraph = JSON.parse(fs.readFileSync("./tst/testGraphs/pointerInterpolateSet.json", "utf8"));
        const eventBus = new DOMEventBus();
        const engine = new BasicBehaveEngine(30, eventBus);
        let executionLog = "";
        const world = {nodes:[{translation:[0,0,0]}]}
        loggingBehaveEngine = new LoggingDecorator(engine, (line:string) => executionLog += line, world);
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
        await new Promise((resolve) => setTimeout(resolve, 2500));
        expect(engine.variables![0].value![0]).toEqual(true);
    });

    it('should correctly set and cancel delays', async () => {
        /**
         * This test ensures that the delay node evaluates correctly
         * 
         * The graph sets sets off two delays, the first of which is immediately cancelled
         * 1) delays 1 and 2 are set off out of a flow/sequence to wait for 1 second and then set their variables to true
         * 2) delay 2 run un-cancelled, while delay 1 is immediately cnacelled
         */
        const behaviorGraph = JSON.parse(fs.readFileSync("./tst/testGraphs/setCancelDelay.json", "utf8"));
        const eventBus = new DOMEventBus();
        const engine = new BasicBehaveEngine(30, eventBus);
        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(engine, (line:string) => executionLog += line, {});
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        expect(engine.variables![0].value![0]).toEqual(false);
        expect(engine.variables![1].value![0]).toEqual(true);
    });

    it('should correctly evaluate loop re-evaluation', async () => {
        /**
         * This test ensures that the loop node evaluates correctly
         * 
         * The graph starts with variables loop=true and while_loop_iterations=0
         * 1) a while loop is set to run using the varibale loop as the condition
         * 2) the while loop increments the while_loop_iterations variable by 1 each time and has a doN in its flow
         * 3) when doN's currentCount is 5, the loop condition is set to false and the loop is exited
         */
        const behaviorGraph = JSON.parse(fs.readFileSync("./tst/testGraphs/loopReEvaulation.json", "utf8"));
        const eventBus = new DOMEventBus();
        const engine = new BasicBehaveEngine(1, eventBus);
        let executionLog = "";
        loggingBehaveEngine = new LoggingDecorator(engine, (line:string) => executionLog += line, {});
        loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
        expect(engine.variables![0].value![0]).toEqual(false);
        expect(engine.variables![1].value![0]).toEqual(5);
    });

   it("should interpolate variable properly", async () => {
    /**
     * This test ensures that the variable/interpolate node evaluates correctly
     * 
     * The graph sets a variable to true if the variables stored in the interpolated driver variable and copied variable (set onTick) are close to equal
     * 1) start interpolation of driver variable from 0 to 1 over 1 second
     * 2) set the copied variable to the driver variable onTick
     * 3) when the interpolation is done, compare the driver and copied varible to see if they are close to equal (since the final update of the driver will execute the test set before the next onTick we cannot assert perfect equality)
     */
    const behaviorGraph = JSON.parse(fs.readFileSync("./tst/testGraphs/variableSetGetInterpolate.json", "utf8"));
    const eventBus = new DOMEventBus();
    const engine = new BasicBehaveEngine(60, eventBus);
    let executionLog = "";
    loggingBehaveEngine = new LoggingDecorator(engine, (line:string) => executionLog += line, {});
    loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(engine.variables![0].value![0]).toEqual(true);
   });

   it("should correctly evaluate custom events", async () => {
    /**
     * This test ensures that the custom event node evaluates correctly
     * 
     * The graph has is triggered by a custom event and loops 5 times via a custom event send/recieve loop
     * 1) a custom event is dispatched to the graph
     * 2) the custom event sis recieved and the value of count  + 1 is re-sent to custom event/send
     * 3) this continues 5 times and the variable count is set to the last result recieved from the custom event receive node
     */

    const behaviorGraph = JSON.parse(fs.readFileSync("./tst/testGraphs/customEventsLoop.json", "utf8"));
    const eventBus = new DOMEventBus();
    const engine = new BasicBehaveEngine(60, eventBus);
    let executionLog = "";
    loggingBehaveEngine = new LoggingDecorator(engine, (line:string) => executionLog += line, {});
    loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
    loggingBehaveEngine.dispatchCustomEvent("KHR_INTERACTIVITY:async_loop", {count: 0});
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(engine.variables![0].value![0]).toEqual(5);
   });

   it("should correctly evaluate unknown nodes", async () => {
    /**
     * This test ensures that the unknown nodes evaluate correctly
     * 
     * The graph has a fake/flowNode that is not known to the engine and should be ignored and a fake/getNode that is known and should be evaluated with default output values
     * 1) lifecycle starts and hits a sequence which first triggers a fake/flowNode which is not known and is ignored
     * 2) the sequence then triggers a variable/set which is known and should be evaluated with default output values (int= 0 ) which
     * 3) the variable set sets the test variable to true if the value from the fake/getNode is 0
     */

    const behaviorGraph = JSON.parse(fs.readFileSync("./tst/testGraphs/unkownNodes.json", "utf8"));
    const eventBus = new DOMEventBus();
    const engine = new BasicBehaveEngine(1, eventBus);
    let executionLog = "";
    loggingBehaveEngine = new LoggingDecorator(engine, (line:string) => executionLog += line, {});
    loggingBehaveEngine.loadBehaveGraph(behaviorGraph);
    expect(engine.variables![0].value![0]).toEqual(true);
   });
});
