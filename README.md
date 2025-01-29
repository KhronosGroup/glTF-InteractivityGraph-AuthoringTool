# DCC React App for Authoring glTF Assets with KHR_interactivity Extension

This README provides an overview and instructions for using the DCC (Digital Content Creation) React app for authoring glTF assets with the new KHR_interactivity extension.

[Live Link](https://github.khronos.org/glTF-InteractivityGraph-AuthoringTool/)

## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
- [Usage](#usage)
- [Advanced](#advanced)
  - [Bringing Your Own Engine](#bringing-your-own-engine)
  - [Extending types](#extending-types)
  - [Adding Nodes to BasicBehaveEngine](#adding-nodes-to-basicbehaveengine)
  - [Registering Pointer mappings](#registering-pointer-mappings)
- [W.I.P.](#wip)

## Introduction

This React-based Digital Content Creation (DCC) app is designed to streamline the process of authoring glTF assets with the KHR_interactivity extension. The KHR_interactivity extension allows you to add interactive features and behaviors to your 3D models, enhancing the user experience in 3D applications.

With this app, you can easily import, create, edit, and export glTF assets with KHR_interactivity extension support.

## Features

- **User-Friendly Interface**: The app provides an intuitive and user-friendly interface for creating and editing glTF assets.
- **KHR_interactivity Support**: Easily add and configure KHR_interactivity extension features to your 3D models.
- **Real-time Preview**: Preview your 3D model with interactivity features in real-time as you make changes.
- **Export Options**: Export your authored glTF assets with the KHR_interactivity extension included.
- **Engine Extensible**: The execution and authoring components are completely decoupled allowing for extending the app to use your own KHR_interactivity engine.

## Getting Started

Follow these instructions to set up and use the DCC React app for authoring glTF assets with KHR_interactivity extension.

### Prerequisites

1. Install [Node.js](https://nodejs.org/en/download/prebuilt-installer). Please use an LTS version of Node.js.

### Installation

1. Install the required dependencies:

   ```bash
   npm install --force
   ```
   There are some dependency conflicts between the version of react that jest wants and the version used by reactflow, until that is fixed use the force flag for installation.

## Usage

1. Start the DCC React app:

   ```bash
   npm start
   ```

2. Open your web browser and go to [http://localhost:3000](http://localhost:3000).

3. Use the app's interface to create or load your glTF asset. (There is a menu bar for adding custom events and variables on the right hand side, right-click the authoring view panel to bring up the add node modal)

4. Pick your engine (currently Logging or Babylon) and press play to see your graph in action. NOTE: if using the Babylon engine you will need to upload a glb first.

5. Use the Send Custom Event button to trigger custom events specified in your graph.

6. Once you're satisfied, export the glTF asset with the KHR_interactivity extension included.

## Imporant Notes About Tool Execution
1. **Variable Intial State:** The tool passes around JSON for the execution graph (in which initial variable values can be updated by running) please read [Variable Behavior Guide](variable-behavior.md).

## Advanced

This section is about how to add custom nodes and types to the authoring view and the execution engines as well as configuring the app to work with your own engine.

### Bringing your own engine
To add your own engine, you simply need to add a new [EngineType](./src/components/engineViews/EngineType.ts) and then add a tab and panel in [App.tsx](./src/App.tsx) to show a component built around your engine. The mechanism for communication between the Authoring View and the engines
is the behaveGraphRef which just stores a JSON of the current KHR_interactivity graph, your engine should ingest that JSON and run the graph.

### Extending types
Currently, types are located in the standard types array found in the [AuthoringNodeSpecs](./src/authoring/AuthoringNodeSpecs.ts) so to add a type just specify it there, for custom types, you should use signature "custom" and provide and extension for the structure (see AMZN_interactivity_string in the array as an example).
These custom types can then be added to the input value types arrays you want to use them in. For things like types of custom event values and variables, the authoring component will automatically check the graph's types array and allow you to pick your desired type via a dropdown.

### Adding Nodes to BasicBehaveEngine
The provided Basic BehaveEngine uses a decorator approach, so you behave nodes will be defined only once and the Logging and Babylon decorators will decorate certain touch points in the execution logic with their specific functionality. To create a new node...
1. add your new node's spec in [AuthoringNodeSpecs](./src/authoring/AuthoringNodeSpecs.ts)
2. add a new class in the [nodes directory](./src/BasicBehaveEngine/nodes) which extends BehaveEngineNode.
3. add your REQUIRED_VALUES and/or REQUIRED_CONFIGURATIONS arrays which will be used to validate the node.
4. In your constructor, run super() then set the instance name and finally run the needed validations (flows, values and configurations) for your node
5. override processNode, if your node has custom named out flows (i.e. in branch we have true and false instead of out) use this.processFlow, if not you can either do this.processFlow on the default out flow or run super.processNode
6. Finally, either in [BasicBehaveEngine](./src/BasicBehaveEngine/BasicBehaveEngine.ts) or in the decorator of your choice, call registerBehaveEngineNode with the namespace of your node and the node class name
7. If you want to do some complex behaviors, like async listeners look at [CustomEvent/Receive](./src/BasicBehaveEngine/nodes/customEvent/Receive.ts) it has a good example of how async nodes post their subsequent flows to the execution queue instead of invoking synchronously and shows how to set up an event listener so it is not triggered by another node but an event.

### Registering Pointer mappings
The KHR_interactivity spec allows for setting and getting properties of an object model, this logic of mapping an object path to a setter and getter is handled by the respective decorator (so a logging engine can set a path in a different way than a Babylon one to help with implementation specific mapping).
To add your own pointer, simply add the logic for your getter and setter to the registerKnownPointers function in the respective Decorators.


## TODO
- ensure math node properly deal with NaN, inf and 0 inputs
- negation and abs integer min case
- complex flow nodes with edge cases tested: switch, multigate, for, doN, waitAll, throttle, setDelay
- variable and pointer interpolation take action on tick instead of own event loop
- animations thuroughly tested
- camera and animation json pointers
- customEvent default values for event values
- configuration default values and validation
- decleration validation
- read through validation steps in spec and add any missing

### Non normative implementations
- writing mesh material with pointer path (will be replaced in the future when KHR_materials_variants is specified) > "/meshes/${nodeIndex}/primitives/${primitiveIndex}/material""