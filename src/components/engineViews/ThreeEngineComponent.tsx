import { useEffect, useRef, useState, useContext } from "react";
import { Button, Col, Container, Form, Modal, Row, Tab, Tabs } from "react-bootstrap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTF, GLTFLoader, GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { Spacer } from "../Spacer";
import { InteractivityGraphContext } from "../../InteractivityGraphContext";
import { DOMEventBus } from "../../BasicBehaveEngine/eventBuses/DOMEventBus";
import { KHR_interactivity_three } from "../../loaderExtensions/KHR_interactivity";
import { ThreeDecorator } from "../../BasicBehaveEngine/decorators/ThreeDecorator";
import { BasicBehaveEngine } from "../../BasicBehaveEngine/BasicBehaveEngine";
import { WebGLRenderer, Scene, PerspectiveCamera, AnimationMixer, Clock, Group, AnimationClip, SRGBColorSpace, AmbientLight, DirectionalLight, Box3, Vector3, Object3D, Material, Mesh } from "three";

enum ThreeEngineModal {
    CUSTOM_EVENT = "CUSTOM_EVENT",
    NONE = "NONE"
}

export const ThreeEngineComponent = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<WebGLRenderer | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    const cameraRef = useRef<PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animationMixerRef = useRef<AnimationMixer | null>(null);
    const clockRef = useRef<Clock | null>(null);
    const threeLoaderRef = useRef<GLTFLoader | null>(null);
    const [activeKey, setActiveKey] = useState("1");
    const [graphRunning, setGraphRunning] = useState(false);
    const [openModal, setOpenModal] = useState<ThreeEngineModal>(ThreeEngineModal.NONE);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const threeEngineRef = useRef<ThreeDecorator | null>(null);
    const [fileUploaded, setFileUploaded] = useState<string | null>(null);
    const [clickedHotSpot, setClickedHotSpot] = useState<string | null>(null);
    const [loadedModel, setLoadedModel] = useState<Group | null>(null);
    const [animations, setAnimations] = useState<AnimationClip[]>([]);

    const { getExecutableGraph, loadGraphFromJson } = useContext(InteractivityGraphContext);

    useEffect(() => {
        // Create the js renderer
        const renderer = new WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current?.clientWidth || 800, containerRef.current?.clientHeight || 600);
        renderer.setClearColor(0x333333);
        renderer.outputColorSpace = SRGBColorSpace;
        rendererRef.current = renderer;
        containerRef.current?.appendChild(renderer.domElement);

        // Create scene
        const scene = new Scene();
        sceneRef.current = scene;

        // Create camera
        const camera = new PerspectiveCamera(
            75,
            (containerRef.current?.clientWidth || 800) / (containerRef.current?.clientHeight || 600),
            0.1,
            1000
        );
        camera.position.z = 5;
        cameraRef.current = camera;

        // Add lights
        const ambientLight = new AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Add orbit controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controlsRef.current = controls;

        // Set up GLTF Loader with extensions
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        
        const ktx2Loader = new KTX2Loader();
        ktx2Loader.setTranscoderPath('https://www.gstatic.com/basis-universal/latest/');
        
        const gltfLoader = new GLTFLoader();

        // Register the custom KHR_interactivity extension
        gltfLoader.register((parser) => {
            return new KHR_interactivity_three(parser);
        });
        
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.setKTX2Loader(ktx2Loader);
        gltfLoader.setMeshoptDecoder(MeshoptDecoder);
        threeLoaderRef.current = gltfLoader;

        // Animation clock
        clockRef.current = new Clock();

        // Setup animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (controlsRef.current) {
                controlsRef.current.update();
            }
            
            if (animationMixerRef.current) {
                const delta = clockRef.current?.getDelta() || 0;
                animationMixerRef.current.update(delta);
            }
            
            // Update ThreeDecorator if initialized
            if (threeEngineRef.current) {
                const delta = clockRef.current?.getDelta() || 0;
                threeEngineRef.current.update(delta);
            }
            
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        
        animate();

        // Handle window resize
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
            
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            
            rendererRef.current.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);

        return () => {
            // Clean up resources when the component unmounts
            window.removeEventListener('resize', handleResize);
            
            if (rendererRef.current) {
                containerRef.current?.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            
            if (controlsRef.current) {
                controlsRef.current.dispose();
            }
            
            if (threeEngineRef.current) {
                threeEngineRef.current.clearCustomEventListeners();
            }
        };
    }, []);

    useEffect(() => {
        if (fileUploaded !== null) {
            play(true);
        }
    }, [fileUploaded]);

    const play = (shouldOverrideGraph: boolean) => {
        console.log("Play called with shouldOverrideGraph:", shouldOverrideGraph);
        resetScene()
            .then(async result => {
                // Note: we're passing loadedModel.scene (the gltf scene) directly to runGraph instead of sceneRef.current
                await runGraph(threeEngineRef, getExecutableGraph(), result.loadedModelScene, result.nodes, result.materials, result.animations, result.meshes, shouldOverrideGraph, result.parser!);
                setGraphRunning(true);
            });
    };

    const resetScene = async () => {
        console.log("Reset scene called");
        if (!sceneRef.current || !threeLoaderRef.current || !fileInputRef.current?.files?.[0]) {
            console.warn("Missing required references for scene reset");
            return { loadedModelScene: null, nodes: [], materials: [], animations: [], meshes: [], parser: null };
        }
        
        // Clear previous model
        if (loadedModel) {
            sceneRef.current.remove(loadedModel);
            setLoadedModel(null);
        }
        
        const file = fileInputRef.current.files[0];
        const url = URL.createObjectURL(file);
        console.log("Loading GLB from URL:", url);
        
        try {
            const gltf = await loadGLTF(url);
            console.log("GLTF loaded successfully:", gltf);
            console.log("Scene userData after loading:", gltf.scene.userData);
            
            // Keep a reference to loaded model's scene, which has the behaveGraph in userData
            const loadedModelScene = gltf.scene;
            
            // Add model to scene
            sceneRef.current.add(loadedModelScene);
            setLoadedModel(loadedModelScene);
            
            // Set up animations
            if (gltf.animations && gltf.animations.length > 0) {
                console.log("Found animations:", gltf.animations.length);
                animationMixerRef.current = new AnimationMixer(loadedModelScene);
                setAnimations(gltf.animations);
            }
            
            // Reset camera position and controls
            if (cameraRef.current && controlsRef.current) {
                // Calculate bounding box to properly frame the model
                const box = new Box3().setFromObject(loadedModelScene);
                const center = box.getCenter(new Vector3());
                const size = box.getSize(new Vector3());
                
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = cameraRef.current.fov * (Math.PI / 180);
                const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
                
                cameraRef.current.position.set(center.x, center.y, center.z + cameraZ);
                controlsRef.current.target.set(center.x, center.y, center.z);
                controlsRef.current.update();
            }
            
            // Extract necessary elements from the model
            return {
                loadedModelScene, // Return the loaded model's scene which has userData
                nodes: extractGLTFNodes(loadedModelScene),
                materials: extractMaterials(loadedModelScene),
                animations: gltf.animations || [],
                meshes: extractMeshes(loadedModelScene),
                parser: gltf.parser,
            };
        } catch (error) {
            console.error("Error loading GLB file:", error);
            return { loadedModelScene: null, nodes: [], materials: [], animations: [], meshes: [] };
        }
    };

    const loadGLTF = (url: string): Promise<GLTF> => {
        return new Promise((resolve, reject) => {
            if (!threeLoaderRef.current) {
                reject(new Error("GLTF Loader not initialized"));
                return;
            }
            
            threeLoaderRef.current.load(
                url,
                (gltf) => {
                    console.log("GLTF loaded callback:", gltf);
                    resolve(gltf);
                },
                (progress) => {
                    console.log(`Loading progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error("Error in GLTF loading:", error);
                    reject(error);
                }
            );
        });
    };

    const extractGLTFNodes = (scene: Group): Object3D[] => {
        const nodes: Object3D[] = [];
        
        scene.traverse((object) => {
            // In a real implementation, we would need to extract node information similar to the Babylon implementation
            nodes.push(object);
        });
        
        console.log(`Extracted ${nodes.length} nodes from scene`);
        return nodes;
    };

    const extractMaterials = (scene: Group): Material[] => {
        const materials: Material[] = [];
        const uniqueMaterials = new Set<Material>();
        
        scene.traverse((object: any) => {
            if (object.isMesh && object.material) {
                const objMaterials: Array<Material> = Array.isArray(object.material) ? object.material : [object.material];
                objMaterials.forEach(material => {
                    if (!uniqueMaterials.has(material)) {
                        uniqueMaterials.add(material);
                        materials.push(material);
                    }
                });
            }
        });
        
        console.log(`Extracted ${materials.length} materials from scene`);
        return materials;
    };

    const extractMeshes = (scene: Group): Mesh[] => {
        const meshes: Mesh[] = [];
        
        scene.traverse((object) => {
            if (object.type === 'Mesh') {
                meshes.push(object as Mesh);
            }
        });
        
        console.log(`Extracted ${meshes.length} meshes from scene`);
        return meshes;
    };

    const runGraph = async (
        threeEngineRef: any, 
        behaveGraph: any, 
        scene: Scene | Group | null, 
        nodes: Object3D[], 
        materials: Material[], 
        animations: AnimationClip[], 
        meshes: Mesh[], 
        shouldOverride: boolean,
        parser: GLTFParser | null,
    ) => {
        if (!scene) {
            console.error("No scene provided to runGraph");
            return;
        }
        
        console.log("Running graph with:", { 
            behaveGraph, 
            scene, 
            nodesCount: nodes.length, 
            materialsCount: materials.length,
            animationsCount: animations.length,
            meshesCount: meshes.length,
            shouldOverride
        });
        
        console.log("Scene userData before graph run:", scene.userData);
        
        if (threeEngineRef.current !== null) {
            console.log("Clearing previous event listeners");
            threeEngineRef.current.clearCustomEventListeners();
        }
        
        const world = { glTFNodes: nodes, animations, materials, meshes };
        const eventBus = new DOMEventBus();
        
        // Create a new ThreeDecorator with a fresh BehaveEngine
        console.log("Creating new ThreeDecorator");
        threeEngineRef.current = new ThreeDecorator(new BasicBehaveEngine(60, eventBus), world, scene as Scene);
        
        // Initialize the world with the scene
        console.log("Initializing world with scene");
        await threeEngineRef.current.initializeWorld(scene, parser);
        
        // Set the camera for interactions
        if (cameraRef.current) {
            threeEngineRef.current.setCamera(cameraRef.current);
        }
        
        // Setup pointer events for interactivity
        if (rendererRef.current) {
            threeEngineRef.current.setupPointerEvents(rendererRef.current.domElement);
        }
        
        // Extract the behave graph from the scene (if present from GLTFLoader)
        const extractedBehaveGraph = threeEngineRef.current.extractBehaveGraphFromScene();
        
        if ((!behaveGraph.nodes || behaveGraph.nodes.length === 0 || shouldOverride) && extractedBehaveGraph) {
            // Use the graph from the loaded file
            loadGraphFromJson(extractedBehaveGraph);
            threeEngineRef.current.loadBehaveGraph(extractedBehaveGraph);
        } else {
            // Use the graph from the authoring tool
            threeEngineRef.current.loadBehaveGraph(behaveGraph);
        }
    };

    const exportKHRInteractivityGLB = async () => {
        if (!fileInputRef.current?.files?.[0]) {
            return;
        }
        
        const file = fileInputRef.current.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const arrayBuffer = e.target!.result;
            const dataView = new DataView(arrayBuffer as ArrayBuffer);

            // Read bytes 12 to 16 as a little-endian number
            const glTFLengthOriginal = dataView.getUint32(12, true); // true for little-endian

            // Read bytes 20 to (20 + littleEndianNumber) as a JSON string
            const glTFBytes = new Uint8Array(arrayBuffer as ArrayBuffer, 20, glTFLengthOriginal);
            const glTFString = new TextDecoder().decode(glTFBytes);

            // Parse the JSON string
            const glTF = JSON.parse(glTFString);

            // Add KHR_interactivity extension
            glTF['extensions'] = glTF['extensions'] || {};
            glTF['extensions']['KHR_interactivity'] = {
                graphs: [getExecutableGraph()],
                graph: 0
            };
            
            glTF['extensionsUsed'] = glTF['extensionsUsed'] || [];
            if (!glTF['extensionsUsed'].includes('KHR_interactivity')) {
                glTF['extensionsUsed'].push('KHR_interactivity');
            }

            // Ensure padding for the JSON section
            let glTFOutStr = JSON.stringify(glTF);
            while (new TextEncoder().encode(glTFOutStr).length % 4 !== 0) {
                glTFOutStr += " ";
            }
            
            const glTFLengthNew = new TextEncoder().encode(glTFOutStr).length;
            const glbSizeOriginal = dataView.getUint32(8, true); // true for little-endian
            const byteIncreaseAmount = glTFLengthNew - glTFLengthOriginal;

            // Create new GLB file
            const binaryData = new Uint32Array((glbSizeOriginal + byteIncreaseAmount)/4);
            const glbView = new DataView(binaryData.buffer);

            // Set GLB header
            glbView.setUint32(0, 0x46546C67, true); // 'glTF' magic
            glbView.setUint32(4, 0x00000002, true); // Version 2
            glbView.setUint32(8, glbSizeOriginal + byteIncreaseAmount, true); // Total size

            // Set JSON chunk header
            glbView.setUint32(12, glTFLengthNew, true); // JSON chunk length
            glbView.setUint32(16, 0x4E4F534A, true); // 'JSON' chunk type
            
            // Copy JSON content
            const glTFOutStringBytes = new TextEncoder().encode(glTFOutStr);
            for (let i = 0; i < glTFOutStringBytes.length; i++) {
                glbView.setUint8(20 + i, glTFOutStringBytes[i]);
            }

            // Copy binary chunks
            for (let i = glTFLengthOriginal + 20; i < dataView.byteLength; i += 4) {
                glbView.setUint32(i + byteIncreaseAmount, dataView.getUint32(i, true), true);
            }

            // Create and download file
            const blob = new Blob([binaryData], { type: 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = 'interactive.glb';
            downloadLink.click();
            URL.revokeObjectURL(blobUrl);
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div style={{width: "90vw", margin: "0 auto"}}>
            <div style={{background: "#3d5987", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16}}>
                <Button variant="outline-light" onClick={() => {
                    play(false)
                }} disabled={fileUploaded == null}>
                    Play
                </Button>

                <Spacer width={16} height={0}/>

                <Button variant="outline-light" onClick={() => setOpenModal(ThreeEngineModal.CUSTOM_EVENT)} disabled={!graphRunning}>
                    Send Custom Event
                </Button>

                <Spacer width={16} height={0}/>

                <label className="mx-3" style={{color: "white"}}>Choose file: </label>
                <input className="d-none" type="file" accept=".glb" ref={fileInputRef} onChange={() => {
                    if (fileInputRef.current == null || fileInputRef.current.files == null || fileInputRef.current.files.length == 0) {
                        setFileUploaded(null);
                        return;
                    }
                    setFileUploaded(fileInputRef.current.files[0].name)
                }}/>
                <Button variant="outline-light" onClick={() => fileInputRef.current!.click()}>
                    Upload glb
                </Button>

                <Spacer width={16} height={0}/>

                <Button variant="outline-light" disabled={fileUploaded == null} onClick={() => exportKHRInteractivityGLB()}>
                    Download glb
                </Button>
            </div>

            <div ref={containerRef} style={{ width: '100%', height: '700px' }} />

            <Modal show={openModal === ThreeEngineModal.CUSTOM_EVENT}>
                <Container style={{padding: 16}}>
                    <h3>Send Custom Event</h3>
                    <Tabs
                        activeKey={activeKey}
                        onSelect={(key: any) => setActiveKey(key)}
                    >
                        {getExecutableGraph().events?.map((customEvent: any, index: number) => {
                            return (
                                <Tab title={customEvent.id} eventKey={index + 1}>
                                    <Row style={{textAlign: "left"}}>
                                        {Object.keys(customEvent.values).map((val: any) => {
                                            return (
                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label>{val}</Form.Label>
                                                        <Form.Control id={val} type="text"/>
                                                    </Form.Group>
                                                </Col>
                                            )
                                        })}
                                        <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                                        <Button variant={"outline-primary"} onClick={() => {
                                            const payload: any = {};
                                            for (const val of Object.keys(customEvent.values)) {
                                                payload[val] = (document.getElementById(val) as HTMLInputElement).value;
                                            }
                                            threeEngineRef.current?.dispatchCustomEvent(`KHR_INTERACTIVITY:${customEvent.id}`, payload);
                                            console.log(`Sending custom event: ${customEvent.id}`, payload);
                                            setOpenModal(ThreeEngineModal.NONE);
                                        }}>Send</Button>
                                    </Row>
                                </Tab>
                            )
                        })}
                    </Tabs>
                    <hr style={{ borderTop: '1px solid #777', margin: '16px 0' }} />
                    <Row style={{ marginTop: 16 }}>
                        <Col xs={12} md={12}>
                            <Button variant={"outline-danger"} style={{width: "100%"}} onClick={() => setOpenModal(ThreeEngineModal.NONE)}>
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </Container>
            </Modal>

            <Modal show={clickedHotSpot !== null} onHide={() => setClickedHotSpot(null)}>
                <Modal.Header closeButton>
                    <Modal.Title>My Hotspot</Modal.Title>
                </Modal.Header>
                <Modal.Body>{clickedHotSpot}</Modal.Body>
            </Modal>
        </div>
    );
};