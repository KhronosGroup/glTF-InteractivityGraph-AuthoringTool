# KHR_interactivity Typescript Engine

This README provides an overview and instructions for connecting the BasicBehaveEngine to a frontend (e.g. DCC tool, renderer).

## Table of Contents
- [KHR\_interactivity Typescript Engine](#khr_interactivity-typescript-engine)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [NPM package](#npm-package)
  - [Integration](#integration)
    - [Registering Pointer mappings](#registering-pointer-mappings)
    - [Loading a graph](#loading-a-graph)
    - [Resetting a graph](#resetting-a-graph)
    - [Events](#events)
    - [Animations](#animations)
    - [KHR\_selectability and KHR\_hoverability](#khr_selectability-and-khr_hoverability)
    - [Debugging](#debugging)
    - [Imporant Notes About Tool Execution](#imporant-notes-about-tool-execution)
  - [Development](#development)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Building](#building)
  - [Adding Nodes to BasicBehaveEngine](#adding-nodes-to-basicbehaveengine)
  - [TODO](#todo)
    - [Non normative implementations](#non-normative-implementations)

## Introduction
This engine implements the glTF KHR_interactivity extension.
The KHR_interactivity extension allows you to add interactive features and behaviors to your 3D models, enhancing the user experience in 3D applications.


## NPM package

1. Add this project as a npm package to your project via
   
   ```bash
      npm i @khronosgroup/khr-interactivity-authoring-engine
   ```

## Integration

### Registering Pointer mappings
The KHR_interactivity spec allows for setting and getting properties of an object model, this logic of mapping an object path to a setter and getter is handled by the respective decorator (so a logging engine can set a path in a different way than a Babylon one to help with implementation specific mapping).
To add your own pointer, simply add the logic for your getter and setter to the registerKnownPointers function in the respective Decorators.

### Loading a graph
A graph can be loaded into the engine by calling:
```typescript
loadBehaveGraph(behaveGraph: any, run = true)
```
`behaveGraph` is the JSON representation of the graph. `run` can be set to false, if the graph should not be executed automatically after loading.

The event queue can be pause and played by calling:
```typescript
pauseEventQueue()
playEventQueue()
```
Be aware that you need to pause/play e.g. animations and hover in your renderer.

### Resetting a graph

Resetting the engine needs to be done manually.
An empty graph can be loaded and there are several clear functions for different purposes. 

Additionally, you need to manually reset the animation state and the whole glTF state which was modified by `pointer/set` nodes.


### Events
To sent custom events to the engine call:
```typescript
dispatchCustomEvent(name: string, vals: any)
```
The name needs to be prefixed with `KHR_INTERACTIVITY:`.
Vals is a JSON object containing all values needed for the event.

### Animations
To implement animations the following nodes need to be registered like this:
```typescript
registerBehaveEngineNode("animation/stop", interactivity.AnimationStop);
registerBehaveEngineNode("animation/start", interactivity.AnimationStart);
registerBehaveEngineNode("animation/stopAt", interactivity.AnimationStopAt);
```

Additionally, the following functions need to be added to the `BasicBehaveEngine`:
```typescript
this.behaveEngine.stopAnimation = (animationIndex: number): void => {
   //TODO
};
this.behaveEngine.stopAnimationAt = (animationIndex: number, stopTime: number , callback: () => void): void => {
   //TODO
};
this.behaveEngine.startAnimation = (animationIndex: number, startTime: number, endTime: number, speed: number,  callback: () => void): void => {
   //TODO
};
```

For implementation details, check out the KHR_interactivity specification.

### KHR_selectability and KHR_hoverability
To implement KHR_selectability and KHR_hoverability the following nodes need to be registered like this:
```typescript
registerBehaveEngineNode("event/onSelect", interactivity.OnSelect);
registerBehaveEngineNode("event/onHoverIn", interactivity.OnHoverIn);
registerBehaveEngineNode("event/onHoverOut", interactivity.OnHoverOut);
```

Additionally, the following function need to be added to the `BasicBehaveEngine`:
```typescript
this.behaveEngine.getParentNodeIndex = (nodeIndex: number) => number | undefined => {
   // Return index of parent node. If no parent exists return undefined.
}
```

You can pass a selection event via:
```typescript
select(selectedNodeIndex: number, controllerIndex: number, selectionPoint: [number, number, number] | undefined, selectionRayOrigin: [number, number, number] | undefined);
```

`selectionPoint` and `selectionRayOrigin` are optional.

You can pass a hover event via:
```typescript
hoverOn(hoveredNodeIndex: number | undefined, controllerIndex: number);
```
`hoveredNodeIndex` can be undefined if nothing is hover over.

### Debugging
The following functions of the BasicBehaveEngine can be used to perform debugging/logging etc.
```typescript
this.behaveEngine.processNodeStarted = (behaveEngineNode: BehaveEngineNode) => void {
   
};
this.behaveEngine.processAddingNodeToQueue = (flow: IInteractivityFlow) => void {

};
this.behaveEngine.processExecutingNextNode = (flow: IInteractivityFlow) => void {

};
```

### Imporant Notes About Tool Execution
1. The tool passes around JSON for the execution graph. Be aware that the engine does not necessarily create deep copies of arrays or objects. Modifying these from outside the engine might create undefined/unexpected behavior. Make sure to not modify passed values or create deep copies.
2. The engine expects matrices in 2D structure e.g. `[[1.0, 0.0],[0.0, 1.0]]`. This needs to be considered for e.g. registering worldMatrix or matrix

## Development

### Prerequisites

1. Install [Node.js](https://nodejs.org/en/download/prebuilt-installer). Please use an LTS version of Node.js.

### Installation

1. Install the required dependencies:
   
   ```bash
   npm install
   ```

### Building

1. Run 
   
   ```bash
   npm run build
   ```

All files are build into the build folder. Source maps are generated but not published via npm.

## Adding Nodes to BasicBehaveEngine
The provided Basic BehaveEngine uses a decorator approach, so you behave nodes will be defined only once and the Logging and Babylon decorators will decorate certain touch points in the execution logic with their specific functionality. To create a new node...
1. add a new class in the [nodes directory](./nodes) which extends BehaveEngineNode.
2. add your REQUIRED_VALUES and/or REQUIRED_CONFIGURATIONS arrays which will be used to validate the node.
3. In your constructor, run super() then set the instance name and finally run the needed validations (flows, values and configurations) for your node
4. override processNode, if your node has custom named out flows (i.e. in branch we have true and false instead of out) use this.processFlow, if not you can either do this.processFlow on the default out flow or run super.processNode
5. Finally, either in [BasicBehaveEngine](./BasicBehaveEngine.ts) or in the decorator of your choice, call registerBehaveEngineNode with the namespace of your node and the node class name
6. If you want to do some complex behaviors, like async listeners look at [CustomEvent/Receive](./nodes/customEvent/Receive.ts) it has a good example of how async nodes post their subsequent flows to the execution queue instead of invoking synchronously and shows how to set up an event listener so it is not triggered by another node but an event.


## TODO
- customEvent default values for event values
- configuration default values and validation
- decleration validation
- read through validation steps in spec and add any missing
- handle graphs with different types in authoring system => do not override types array or assume it is always the standard one
- unit test to ensure graph values are not overwritten when loaded into authoring view for all nodes (especially ones with configurations)

### Non normative implementations
- writing mesh material with pointer path (will be replaced in the future when KHR_materials_variants is specified) > "/meshes/${nodeIndex}/primitives/${primitiveIndex}/material""
