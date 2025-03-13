import { ADecorator } from "./ADecorator";
import { BehaveEngineNode } from "../BehaveEngineNode";
import { IBehaveEngine } from "../IBehaveEngine";
import { cubicBezier, easeFloat, easeFloat3, easeFloat4, linearFloat, slerpFloat4 } from "../easingUtils";
import { IInteractivityFlow } from "../../types/InteractivityGraph";
import { AnimationStart } from "../nodes/animation/AnimationStart";
import { AnimationStop } from "../nodes/animation/AnimationStop";
import { AnimationStopAt } from "../nodes/animation/AnimationStopAt";
import { OnSelect } from "../nodes/experimental/OnSelect";
import { OnHoverIn } from "../nodes/experimental/OnHoverIn";
import { OnHoverOut } from "../nodes/experimental/OnHoverOut";
import { Scene, Object3D, Raycaster, Vector2, Camera, PerspectiveCamera, Quaternion, Euler, AnimationClip, AnimationMixer, LoopRepeat, LoopOnce, Clock, Material, Mesh, MeshStandardMaterial, Intersection } from "three";

export class ThreeDecorator extends ADecorator {
    scene: Scene;
    world: any;
    hoveredNode: Object3D | null;
    hoveredNodeIndex: number;
    raycaster: Raycaster;
    pointer: Vector2;
    camera: Camera | null;
    domEventBus: any;

    constructor(behaveEngine: IBehaveEngine, world: any, scene: Scene) {
        super(behaveEngine);
        this.world = world;
        this.scene = scene;
        this.hoveredNode = null;
        this.hoveredNodeIndex = -1;
        this.raycaster = new Raycaster();
        this.pointer = new Vector2();
        this.camera = null;

        // Extend behave engine with js specific methods

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.extractBehaveGraphFromScene = this.extractBehaveGraphFromScene;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.alertParentOnSelect = this.alertParentOnSelect;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.alertParentOnHoverIn = this.alertParentOnHoverIn;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.alertParentOnHoverOut = this.alertParentOnHoverOut;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.addNodeClickedListener = this.addNodeClickedListener;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.stopAnimation = this.stopAnimation;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.stopAnimationAt = this.stopAnimationAt;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.behaveEngine.startAnimation = this.startAnimation;

        this.behaveEngine.animateProperty = this.animateProperty;
        this.behaveEngine.animateCubicBezier = this.animateCubicBezier;
        this.behaveEngine.getWorld = this.getWorld;

        this.registerBehaveEngineNode("event/onSelect", OnSelect);
        this.registerBehaveEngineNode("event/onHoverIn", OnHoverIn);
        this.registerBehaveEngineNode("event/onHoverOut", OnHoverOut);
        this.registerBehaveEngineNode("animation/stop", AnimationStop);
        this.registerBehaveEngineNode("animation/start", AnimationStart);
        this.registerBehaveEngineNode("animation/stopAt", AnimationStopAt);

        // Register known pointers and set up event listeners
        this.registerKnownPointers();
    }

    processAddingNodeToQueue = (flow: IInteractivityFlow) => {
        // No-op for now
    }

    processExecutingNextNode = (flow: IInteractivityFlow) => {
        // No-op for now
    }

    processNodeStarted = (node: BehaveEngineNode) => {
        // No-op for now
    }

    getWorld = (): any => {
        return this.world;
    }

    public extractBehaveGraphFromScene = (): any => {
        if (!this.scene.userData || !this.scene.userData.behaveGraph) {
            console.info('No behavior found in scene');
            return;
        }

        return this.scene.userData.behaveGraph;
    };

    /**
     * Sets the active camera for the decorator
     * @param camera The js camera to use for raycasting and other operations
     */
    public setCamera = (camera: Camera) => {
        this.camera = camera;

        // Add camera position and rotation pointers if this is a perspective camera
        if (camera instanceof PerspectiveCamera) {
            this.registerJsonPointer(`/extensions/KHR_interactivity/activeCamera/position`, (path) => {
                if (!this.camera) return [0, 0, 0];
                return [this.camera.position.x, this.camera.position.y, this.camera.position.z];
            }, (path, value) => {
                if (this.camera) {
                    this.camera.position.set(value[0], value[1], value[2]);
                }
            }, "float3", false);

            this.registerJsonPointer(`/extensions/KHR_interactivity/activeCamera/rotation`, (path) => {
                if (!this.camera || !(this.camera instanceof PerspectiveCamera)) return [0, 0, 0, 1];

                // Convert euler rotation to quaternion if needed
                const quaternion = new Quaternion();
                quaternion.setFromEuler(this.camera.rotation);

                return [
                    quaternion.x,
                    quaternion.y,
                    quaternion.z,
                    quaternion.w
                ];
            }, (path, value) => {
                if (this.camera) {
                    const quaternion = new Quaternion(value[0], value[1], value[2], value[3]);
                    const euler = new Euler();
                    euler.setFromQuaternion(quaternion);
                    this.camera.rotation.copy(euler);
                }
            }, "float4", false);
        }
    }

    public setupPointerEvents = (domElement: HTMLElement) => {
        // Setup event handlers for pointer events
        domElement.addEventListener('pointermove', this.handlePointerMove);
        domElement.addEventListener('click', this.handleClick);
    }

    private handlePointerMove = (event: PointerEvent) => {
        if (!this.camera) return;

        // Calculate pointer position in normalized device coordinates
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // Check for intersections with objects that have hover enabled
        const intersects = this.raycaster.intersectObjects(this.scene.children, true)
            .filter(obj => {
                const object = obj.object as Object3D;
                return object.userData?.compositeHoverability !== false;
            });

        const oldHoveredNode = this.hoveredNode;
        const oldHoveredNodeIndex = this.hoveredNodeIndex;

        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            this.hoveredNode = intersectedObject;

            // Find the index of the node in the world's glTFNodes array
            const hitNodeIndex = this.world.glTFNodes.findIndex(
                (node: Object3D) => node.uuid === intersectedObject.uuid
            );
            this.hoveredNodeIndex = hitNodeIndex;

            // Handle hover events
            let curNode: Object3D | null = intersectedObject;

            // Swim up tree and set hovered to true on parents
            while (curNode != null) {
                curNode.userData = curNode.userData || {};
                curNode.userData.shouldExecuteHoverIn = curNode.userData.hovered == null || curNode.userData.hovered == false;
                curNode.userData.hovered = true;
                curNode.userData.hoveredNodeIndex = hitNodeIndex;
                curNode = curNode.parent;
            }

            // Find onHoverIn callback in parent chain
            curNode = intersectedObject;
            while (curNode != null && (!curNode.userData || !curNode.userData.onHoverInCallback)) {
                curNode = curNode.parent;
            }

            if (curNode != null) {
                curNode.userData.onHoverInCallback(hitNodeIndex, 0);
            }
        } else {
            this.hoveredNode = null;
            this.hoveredNodeIndex = -1;
        }

        // Handle hover out events
        if (oldHoveredNode && (this.hoveredNode?.uuid !== oldHoveredNode.uuid)) {
            let curNode: Object3D | null = oldHoveredNode;

            // Swim up tree and set hovered to false on parents
            while (curNode != null) {
                curNode.userData.shouldExecuteHoverOut = curNode.userData.hovered === true &&
                    curNode.userData.hoveredNodeIndex === oldHoveredNodeIndex;
                curNode.userData.hovered = false;
                curNode.userData.hoveredNodeIndex = -1;
                curNode = curNode.parent;
            }

            // Find onHoverOut callback in parent chain
            curNode = oldHoveredNode;
            while (curNode != null && (!curNode.userData || !curNode.userData.onHoverOutCallback)) {
                curNode = curNode.parent;
            }

            if (curNode != null) {
                curNode.userData.onHoverOutCallback(oldHoveredNodeIndex, 0);
            }
        }
    }

    private handleClick = (event: MouseEvent) => {
        if (!this.camera) {
            console.warn('Camera not set');
            return;
        }

        // Calculate pointer position in normalized device coordinates based on the dom element,
        // which does NOT fill the screen
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the raycaster
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // Check for intersections with objects that are selectable
        const intersects = this.raycaster.intersectObjects(this.scene.children, true)
            .filter(obj => {
                const object = obj.object as Object3D;
                return object.userData?.selectable !== false;
            });

        if (intersects.length > 0) {
            const hit = intersects[0];
            const hitObject = hit.object;

            // Check if the object has an onSelectCallback
            if (hitObject.userData?.onSelectCallback) {
                const hitNodeIndex = this.world.glTFNodes.findIndex(
                    (node: Object3D) => node.uuid === hitObject.uuid
                );

                const selectionPoint = [
                    hit.point.x,
                    hit.point.y,
                    hit.point.z
                ];

                const rayOrigin = [
                    this.raycaster.ray.origin.x,
                    this.raycaster.ray.origin.y,
                    this.raycaster.ray.origin.z
                ];

                hitObject.userData.onSelectCallback(selectionPoint, hitNodeIndex, 0, rayOrigin);
            } else {
                console.warn('No onSelectCallback found for hit object');
            }
        } else {
            console.warn('No selectable objects intersected');
        }
    }

    animateProperty = (path: string, easingParameters: any, callback: () => void) => {
        this.behaveEngine.clearPointerInterpolation(path);
        const startTime = Date.now();

        const action = async () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            const t = Math.min(elapsedDuration / easingParameters.easingDuration, 1);
            if (easingParameters.valueType === "float3") {
                const v = easeFloat3(t, easingParameters);
                this.behaveEngine.setPathValue(path, v);
            } else if (easingParameters.valueType === "float4") {
                const v = easeFloat4(t, easingParameters);
                this.behaveEngine.setPathValue(path, v);
            } else if (easingParameters.valueType === "float") {
                const v = easeFloat(t, easingParameters);
                this.behaveEngine.setPathValue(path, v);
            }

            if (elapsedDuration >= easingParameters.easingDuration) {
                this.behaveEngine.setPathValue(path, easingParameters.targetValue);
                this.behaveEngine.clearPointerInterpolation(path);
                callback();
            }
        };

        this.behaveEngine.setPointerInterpolationCallback(path, { action: action });
    }

    animateCubicBezier = (
        path: string,
        p1: number[],
        p2: number[],
        initialValue: any,
        targetValue: any,
        duration: number,
        valueType: string,
        callback: () => void
    ) => {
        this.behaveEngine.clearPointerInterpolation(path);
        const startTime = Date.now();

        const action = async () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            const t = Math.min(elapsedDuration / duration, 1);
            const p = cubicBezier(t, {x: 0, y:0}, {x: p1[0], y:p1[1]}, {x: p2[0], y:p2[1]}, {x: 1, y:1});

            if (valueType === "float3") {
                const value = [
                    linearFloat(p.y, initialValue[0], targetValue[0]),
                    linearFloat(p.y, initialValue[1], targetValue[1]),
                    linearFloat(p.y, initialValue[2], targetValue[2])
                ];
                this.behaveEngine.setPathValue(path, value);
            } else if (valueType === "float4") {
                if (this.isSlerpPath(path)) {
                    const value = slerpFloat4(p.y, initialValue, targetValue);
                    this.behaveEngine.setPathValue(path, value);
                } else {
                    const value = [
                        linearFloat(p.y, initialValue[0], targetValue[0]),
                        linearFloat(p.y, initialValue[1], targetValue[1]),
                        linearFloat(p.y, initialValue[2], targetValue[2]),
                        linearFloat(p.y, initialValue[3], targetValue[3])
                    ];
                    this.behaveEngine.setPathValue(path, value);
                }
            } else if (valueType === "float") {
                const value = [linearFloat(p.y, initialValue[0], targetValue[0])];
            } else if (valueType == "float2") {
                const value = [
                    linearFloat(p.y, initialValue[0], targetValue[0]),
                    linearFloat(p.y, initialValue[1], targetValue[1])
                ];
                this.behaveEngine.setPathValue(path, value);
            }

            if (elapsedDuration >= duration) {
                this.behaveEngine.setPathValue(path, targetValue);
                this.behaveEngine.clearPointerInterpolation(path);
                callback();
            }
        };

        this.behaveEngine.setPointerInterpolationCallback(path, { action: action });
    }

    public alertParentOnSelect = (selectionPoint: number[], selectedNodeIndex: number, controllerIndex: number, selectionRayOrigin: number[], childNodeIndex: number): void => {
        let curNode = this.world.glTFNodes[childNodeIndex].parent;
        while (curNode !== null && (!curNode.userData || !curNode.userData.onSelectCallback)) {
            curNode = curNode.parent;
        }

        if (curNode !== null) {
            curNode.userData.onSelectCallback(selectionPoint, selectedNodeIndex, controllerIndex, selectionRayOrigin);
        }
    }

    public alertParentOnHoverIn = (selectedNodeIndex: number, controllerIndex: number, childNodeIndex: number): void => {
        let curNode = this.world.glTFNodes[childNodeIndex].parent;
        while (curNode !== null && (!curNode.userData || !curNode.userData.onHoverInCallback)) {
            curNode = curNode.parent;
        }

        if (curNode !== null) {
            curNode.userData.onHoverInCallback(selectedNodeIndex, controllerIndex);
        }
    }

    public alertParentOnHoverOut = (selectedNodeIndex: number, controllerIndex: number, childNodeIndex: number): void => {
        let curNode = this.world.glTFNodes[childNodeIndex].parent;
        while (curNode !== null && (!curNode.userData || !curNode.userData.onHoverOutCallback)) {
            curNode = curNode.parent;
        }

        if (curNode !== null) {
            curNode.userData.onHoverOutCallback(selectedNodeIndex, controllerIndex);
        }
    }

    public addNodeClickedListener = (nodeIndex: number, callback: (selectionPoint: number[], selectedNodeIndex: number, controllerIndex: number, selectionRayOrigin: number[]) => void): void => {
        const node = this.world.glTFNodes[nodeIndex];
        if (!node) return;
        console.log('Adding node clicked listener for node index:', nodeIndex, node, this.world.glTFNodes);

        node.userData = node.userData || {};
        node.userData.onSelectCallback = callback;
    }

    public startAnimation = (animation: number, startTime: number, endTime: number, speed: number, callback: () => void): void => {
        const anim: AnimationClip & { userData: any } = this.world.animations[animation];
        if (!anim) {
            console.warn(`Animation ${animation} not found`);
            if (callback) callback();
            return;
        }

        // Create mixer if it doesn't exist for this animation
        anim.userData = anim.userData || {};

        // If there's an active animation, stop it
        if (anim.userData.mixer) {
            anim.userData.mixer.stopAllAction();
            anim.userData.mixer = undefined;
        }

        // Create a mixer for the animation's target object
        const rootNode = this.world.glTFNodes[0];
        if (!rootNode) {
            console.warn('No root node found for animation');
            if (callback) callback();
            return;
        }

        const mixer = new AnimationMixer(rootNode);
        anim.userData.mixer = mixer;

        // Create and configure the animation action
        const action = mixer.clipAction(anim);

        // Configure the animation based on params
        const fps = 60;
        const startFrame = startTime * fps;
        const endFrame = endTime * fps;

        action.time = startTime;
        action.timeScale = speed;

        const isLooping = !isFinite(endTime) || endTime <= 0;
        action.loop = isLooping ? LoopRepeat : LoopOnce;

        if (!isLooping) {
            action.clampWhenFinished = true;

            // Set up a callback to fire when the animation completes
            const finishedCallback = () => {
                mixer.removeEventListener('finished', finishedCallback);
                if (callback) callback();
            };

            mixer.addEventListener('finished', finishedCallback);
        }

        // Start the animation
        action.play();

        // Store the action for later reference
        anim.userData.action = action;

        // Set up the animation clock
        anim.userData.clock = new Clock();

        // Mark as animating
        anim.userData.animating = true;
    }

    public stopAnimation = (animationIndex: number): void => {
        const anim = this.world.animations[animationIndex];
        if (!anim || !anim.userData || !anim.userData.mixer) return;

        // Stop the animation
        anim.userData.mixer.stopAllAction();
        anim.userData.animating = false;

        // Clean up
        anim.userData.mixer = undefined;
        anim.userData.action = undefined;
    }

    public stopAnimationAt = (animationIndex: number, stopTime: number, callback: () => void): void => {
        const anim = this.world.animations[animationIndex];
        if (!anim || !anim.userData || !anim.userData.mixer || !anim.userData.action) {
            if (callback) callback();
            return;
        }

        const action = anim.userData.action;
        const mixer = anim.userData.mixer;

        // Set the animation to stop at the specified time
        action.time = stopTime;
        action.paused = true;

        // Update mixer one last time to apply the change
        mixer.update(0);

        // Stop the animation
        anim.userData.animating = false;
        anim.userData.mixer = undefined;
        anim.userData.action = undefined;

        // Execute callback
        if (callback) callback();
    }

    /**
     * Initializes the world object with js scene data
     * @param scene The js scene
     * @param parser The glTF parser that contains associations
     */
    public async initializeWorld(scene: Scene, parser: any): Promise<void> {
        console.log('Initializing world with scene and parser');
        // Create the world data structure if it doesn't exist
        if (!this.world) {
            this.world = {
                glTFNodes: [],
                materials: [],
                animations: []
            };
        }

        // Use the parser's nodeCache to correctly map indices to objects
        // This is more reliable than traversing the scene or using associations
        if (parser && parser.nodeCache) {
            
            // Extract nodes from nodeCache which maps directly from glTF indices to THREE objects
            const nodes: Object3D[] = [];
            const maxNodeIndex = Object.keys(parser.nodeCache).reduce((max, key) => 
                Math.max(max, parseInt(key)), -1);
            
            // Fill the nodes array using the nodeCache mapping
            for (let i = 0; i <= maxNodeIndex; i++) {
                const node = await parser.nodeCache[i];
                if (node) {
                    // Store the original index in userData
                    node.userData = node.userData || {};
                    node.userData.gltfIndex = i;
                    nodes[i] = node;
                }
            }
            
            this.world.glTFNodes = nodes.filter(Boolean);
            
            // Extract materials from parser.materialsCache if available
            const materials: Material[] = [];
            if (parser.materialsCache) {
                const maxMaterialIndex = Object.keys(parser.materialsCache).reduce((max, key) => 
                    Math.max(max, parseInt(key)), -1);
                
                for (let i = 0; i <= maxMaterialIndex; i++) {
                    const material = parser.materialsCache[i];
                    if (material) {
                        materials[i] = material;
                    }
                }
                
                this.world.materials = materials.filter(Boolean);
            } else {
                // Fallback: collect materials from meshes if parser cache isn't available
                const uniqueMaterials = new Set<Material>();
                this.world.glTFNodes.forEach((node: Object3D) => {
                    if (node instanceof Mesh) {
                        if (Array.isArray(node.material)) {
                            node.material.forEach(mat => uniqueMaterials.add(mat));
                        } else if (node.material) {
                            uniqueMaterials.add(node.material);
                        }
                    }
                });
                this.world.materials = Array.from(uniqueMaterials);
            }
            
            // Handle animations from scene.userData
            const animations: AnimationClip[] = [];
            if (scene.userData && scene.userData.animations) {
                scene.userData.animations.forEach((anim: AnimationClip) => {
                    animations.push(anim);
                });
            }
            this.world.animations = animations;
        } else {
            console.warn('Parser or nodeCache not available, using fallback method');
            // Fallback: Collect objects by traversing the scene
            const nodes: Object3D[] = [];
            const materials: Material[] = [];
            
            scene.traverse((object) => {
                nodes.push(object);
                
                // Check for materials
                if (object instanceof Mesh) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => {
                            if (!materials.includes(mat)) {
                                materials.push(mat);
                            }
                        });
                    } else if (object.material && !materials.includes(object.material)) {
                        materials.push(object.material);
                    }
                }
            });
            
            this.world.glTFNodes = nodes;
            this.world.materials = materials;
            
            // Handle animations from scene.userData
            const animations: AnimationClip[] = [];
            if (scene.userData && scene.userData.animations) {
                animations.push(...scene.userData.animations);
            }
            this.world.animations = animations;
        }
        
        // Initialize default hoverability and selectability
        this.world.glTFNodes.forEach((node: Object3D, index: number) => {
            node.userData = node.userData || {};
            node.userData.hoverable = node.userData.hoverable ?? true;
            node.userData.selectable = node.userData.selectable ?? true;
            node.userData.nodeIndex = node.userData.gltfIndex ?? index; // Use gltfIndex if available, otherwise use array index
        });

        // Initialize composite properties by swimming down from the root
        this.world.glTFNodes
            .filter((node: Object3D) => !node.parent)
            .forEach((rootNode: Object3D) => {
                this.swimDownHoverability(rootNode, true);
                this.swimDownSelectability(rootNode, true);
            });

        // Register known pointers
        this.registerKnownPointers();
    }

    registerJsonPointer = (jsonPtr: string, getterCallback: (path: string) => any, setterCallback: (path: string, value: any) => void, typeName: string, readOnly: boolean): void => {
        this.behaveEngine.registerJsonPointer(jsonPtr, getterCallback, setterCallback, typeName, readOnly);
    };

    registerKnownPointers = () => {
        const maxGltfNode: number = this.world.glTFNodes.length - 1;
        const maxGlTFMaterials: number = this.world.materials.length - 1;
        const maxAnimations: number = this.world.animations.length - 1;

        // Basic node transformations
        this.registerJsonPointer(`/nodes/${maxGltfNode}/scale`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            return [node.scale.x, node.scale.y, node.scale.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            node.scale.set(value[0], value[1], value[2]);
            node.matrixWorldNeedsUpdate = true;
        }, "float3", false);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/translation`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            return [node.position.x, node.position.y, node.position.z];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])] as Object3D;
            node.position.set(value[0], value[1], value[2]);
            node.matrixWorldNeedsUpdate = true;
        }, "float3", false);

        this.registerJsonPointer(`/nodes/${maxGltfNode}/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            if (!node.quaternion) return [0, 0, 0, 1];
            return [node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            node.quaternion.set(value[0], value[1], value[2], value[3]);
            node.matrixWorldNeedsUpdate = true;
        }, "float4", false);

        // Node visibility
        this.registerJsonPointer(`/nodes/${maxGltfNode}/extensions/KHR_node_visibility/visible`, (path) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            return [node.visible];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            node.visible = value;

            // Update visibility for child meshes that don't have their own pointer
            node.traverse((child: Object3D) => {
                if (child.userData?.pointer === undefined) {
                    child.visible = value;
                }
            });
        }, "bool", false);

        // Node selectability
        this.registerJsonPointer(`/nodes/${maxGltfNode}/extensions/KHR_node_selectability/selectable`, (path) => {
            const parts: string[] = path.split("/");
            const metadata = this.world.glTFNodes[Number(parts[2])].userData;
            if (metadata === undefined) {
                return [true];
            }
            return [metadata.selectable !== false];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            node.userData = node.userData || {};
            node.userData.selectable = value;

            // Apply the composite selectability
            this.swimDownSelectability(node, value);
        }, "bool", false);

        // Node hoverability
        this.registerJsonPointer(`/nodes/${maxGltfNode}/extensions/KHR_node_hoverability/hoverable`, (path) => {
            const parts: string[] = path.split("/");
            const metadata = this.world.glTFNodes[Number(parts[2])].userData;
            if (metadata === undefined) {
                return [true];
            }
            return [metadata.hoverable !== false];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const node = this.world.glTFNodes[Number(parts[2])];
            node.userData = node.userData || {};
            node.userData.hoverable = value;

            // Apply the composite hoverability
            this.swimDownHoverability(node, value);
        }, "bool", false);

        // Material properties - Base color factor (color + alpha)
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorFactor`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (!material || !material.color) return [0, 0, 0, 1];
            return [
                material.color.r,
                material.color.g,
                material.color.b,
                material.opacity
            ];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (material) {
                material.color.setRGB(value[0], value[1], value[2]);
                material.opacity = value[3];
                material.transparent = value[3] < 1.0;
                material.needsUpdate = true;
            }
        }, "float4", false);

        // Material properties - Roughness factor
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/roughnessFactor`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            return material ? [material.roughness] : [0];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (material) {
                material.roughness = value;
                material.needsUpdate = true;
            }
        }, "float", false);

        // Material properties - Metallic factor
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/metallicFactor`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            return material ? [material.metalness] : [0];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (material) {
                material.metalness = value;
                material.needsUpdate = true;
            }
        }, "float", false);

        // Material properties - Alpha cutoff
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/alphaCutoff`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            return material && material.alphaTest !== undefined ? [material.alphaTest] : [0];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (material) {
                material.alphaTest = value;
                material.needsUpdate = true;
            }
        }, "float", false);

        // Material properties - Emissive factor
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/emissiveFactor`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (!material || !material.emissive) return [0, 0, 0];
            return [material.emissive.r, material.emissive.g, material.emissive.b];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (material) {
                material.emissive.setRGB(value[0], value[1], value[2]);
                material.needsUpdate = true;
            }
        }, "float3", false);

        // Texture transforms for the base color texture
        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/offset`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (!material || !material.map) return [0, 0];

            return [material.map.offset.x, material.map.offset.y];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (material && material.map) {
                material.map.offset.set(value[0], value[1]);
                material.needsUpdate = true;
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/scale`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (!material || !material.map) return [1, 1];

            return [material.map.repeat.x, material.map.repeat.y];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (material && material.map) {
                material.map.repeat.set(value[0], value[1]);
                material.needsUpdate = true;
            }
        }, "float2", false);

        this.registerJsonPointer(`/materials/${maxGlTFMaterials}/pbrMetallicRoughness/baseColorTexture/extensions/KHR_texture_transform/rotation`, (path) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (!material || !material.map) return [0];

            return [material.map.rotation];
        }, (path, value) => {
            const parts: string[] = path.split("/");
            const material = this.world.materials[Number(parts[2])] as MeshStandardMaterial;
            if (material && material.map) {
                material.map.rotation = value[0];
                material.needsUpdate = true;
            }
        }, "float", false);

        // Animation properties - Playhead (current time)
        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/playhead`, (path) => {
            const parts: string[] = path.split("/");
            const animation = this.world.animations[Number(parts[2])];
            if (!animation || !animation.userData || !animation.userData.action) {
                return [0];
            }
            return [animation.userData.action.time];
        }, (path, value) => {
            // Read-only in implementation, but API requires setter function
        }, "float", true);

        // Animation properties - Min/max time
        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/minTime`, (path) => {
            const parts: string[] = path.split("/");
            const animation = this.world.animations[Number(parts[2])];
            if (!animation) return [0];
            return [animation.duration > 0 ? 0 : 0]; // Start time is always 0 in js
        }, (path, value) => {
            // Read-only in implementation
        }, "float", true);

        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/maxTime`, (path) => {
            const parts: string[] = path.split("/");
            const animation = this.world.animations[Number(parts[2])];
            if (!animation) return [0];
            return [animation.duration];
        }, (path, value) => {
            // Read-only in implementation
        }, "float", true);

        // Animation properties - Playing state
        this.registerJsonPointer(`/animations/${maxAnimations}/extensions/KHR_interactivity/isPlaying`, (path) => {
            const parts: string[] = path.split("/");
            const animation = this.world.animations[Number(parts[2])];
            return [animation?.userData?.animating || false];
        }, (path, value) => {
            // Read-only in implementation
        }, "bool", true);

        // Collection length information
        this.registerJsonPointer('/nodes.length', (path) => {
            return [this.world.glTFNodes.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/materials.length', (path) => {
            return [this.world.materials.length];
        }, (path, value) => {
            //no-op
        }, "int", true);

        this.registerJsonPointer('/animations.length', (path) => {
            return [this.world.animations.length];
        }, (path, value) => {
            //no-op
        }, "int", true);
    }

    /**
     * Recursively applies selectability to a node and its children
     */
    private swimDownSelectability(node: Object3D, parentSelectability: boolean) {
        const curNodeSelectability = node.userData?.selectable !== false;
        const propagatedSelectability = curNodeSelectability && parentSelectability;

        // Store the composite selectability
        node.userData = node.userData || {};
        node.userData.compositeSelectability = propagatedSelectability;

        // Process children
        node.children.forEach(child => {
            this.swimDownSelectability(child, propagatedSelectability);
        });
    }

    /**
     * Recursively applies hoverability to a node and its children
     */
    private swimDownHoverability(node: Object3D, parentHoverability: boolean) {
        const curNodeHoverability = node.userData?.hoverable !== false;
        const propagatedHoverability = curNodeHoverability && parentHoverability;

        // Store the composite hoverability
        node.userData = node.userData || {};
        node.userData.compositeHoverability = propagatedHoverability;

        // Process children
        node.children.forEach(child => {
            this.swimDownHoverability(child, propagatedHoverability);
        });
    }

    /**
     * Performs a raycast from screen coordinates
     * @param x Screen X coordinate
     * @param y Screen Y coordinate
     * @param width Screen width
     * @param height Screen height
     * @returns The raycast results, if any
     */
    public performRaycast(x: number, y: number, width: number, height: number): Intersection[] {
        if (!this.camera) return [];

        // Calculate pointer position in normalized device coordinates
        this.pointer.x = (x / width) * 2 - 1;
        this.pointer.y = - (y / height) * 2 + 1;

        // Update the raycaster
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // Return all intersections
        return this.raycaster.intersectObjects(this.scene.children, true);
    }

    /**
     * Updates the decorator with a given delta time
     * This should be called from the main render loop
     * @param deltaTime Time in seconds since the last frame
     */
    public update(deltaTime: number): void {
        // Update all active animation mixers
        if (this.world && this.world.animations) {
            for (const animation of this.world.animations) {
                if (animation.userData?.mixer && animation.userData?.animating) {
                    animation.userData.mixer.update(deltaTime);
                }
            }
        }
    }
}