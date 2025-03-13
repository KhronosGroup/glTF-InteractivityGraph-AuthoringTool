import React, {useRef, useState, useEffect} from 'react';
import {AuthoringComponent} from "./components/AuthoringComponent";
import {EngineType} from "./components/engineViews/EngineType";
import {RenderIf} from "./components/RenderIf";
import {LoggingEngineComponent} from "./components/engineViews/LoggingEngineComponent";
import {BabylonEngineComponent} from "./components/engineViews/BabylonEngineComponent";
import {ThreeEngineComponent} from "./components/engineViews/ThreeEngineComponent";
import {Tab, Tabs} from "react-bootstrap";
import {Spacer} from "./components/Spacer";
import { InteractivityGraphProvider } from './InteractivityGraphContext';

// Storage key for persisting the engine type
const ENGINE_TYPE_STORAGE_KEY = 'interactivity-graph-engine-type';

export const App = () => {
  const [engineType, setEngineType] = useState<EngineType>(EngineType.BABYLON);

  // Load stored engine type on initial render
  useEffect(() => {
    const storedEngineType = localStorage.getItem(ENGINE_TYPE_STORAGE_KEY);
    if (storedEngineType && Object.values(EngineType).includes(storedEngineType as EngineType)) {
      setEngineType(storedEngineType as EngineType);
    }
  }, []);

  // Save engine type when it changes
  const handleEngineTypeChange = (type: EngineType) => {
    setEngineType(type);
    localStorage.setItem(ENGINE_TYPE_STORAGE_KEY, type);
  };

  return (
    <InteractivityGraphProvider>
        <div style={{width: "100vw", height: "100vh"}}>
 
        <AuthoringComponent/>
    
        <EngineSelector setEngineType={handleEngineTypeChange}/>

        <Spacer width={0} height={32}/>

        <RenderIf shouldShow={engineType === EngineType.LOGGING}>
             <LoggingEngineComponent/>
        </RenderIf>
        <RenderIf shouldShow={engineType === EngineType.BABYLON}>
            <BabylonEngineComponent/>
        </RenderIf>
        <RenderIf shouldShow={engineType === EngineType.THREE}>
            <ThreeEngineComponent/>
        </RenderIf>
      </div>
    </InteractivityGraphProvider>
      
  );
}

interface EngineSelectorProps {
    setEngineType: (engine: EngineType) => void;
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({setEngineType}) => {
    // Initialize the activeKey based on localStorage if available
    const getInitialTabKey = () => {
        const storedEngineType = localStorage.getItem(ENGINE_TYPE_STORAGE_KEY);
        if (storedEngineType) {
            switch (storedEngineType) {
                case EngineType.LOGGING:
                    return '1';
                case EngineType.BABYLON:
                    return '2';
                case EngineType.THREE:
                    return '3';
                default:
                    return '2'; // Default to Babylon
            }
        }
        return '2'; // Default to Babylon if nothing is stored
    };

    const [activeKey, setActiveKey] = useState(getInitialTabKey());
    
    const handleEngineChange = (key: any) => {
        let engine;
        switch (key) {
            case '1':
                engine = EngineType.LOGGING;
                break;
            case '2':
                engine = EngineType.BABYLON;
                break;
            case '3':
                engine = EngineType.THREE;
                break;
            default:
                throw Error("Invalid Selection")
        }
        setActiveKey(key);
        setEngineType(engine);
    };

    return (
        <div style={{width: "90vw", margin: "0 auto", textAlign: "center", marginTop: 32}}>
            <h2>Behave Graph Execution</h2>
            <Tabs
                activeKey={activeKey}
                onSelect={handleEngineChange}
            >
                <Tab title={"Logging Engine"} eventKey={1}/>
                <Tab title={"Babylon Engine"} eventKey={2}/>
                <Tab title={"Three.js Engine"} eventKey={3}/>
            </Tabs>
        </div>

    );
}
