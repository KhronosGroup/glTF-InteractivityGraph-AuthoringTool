import React, {useRef, useState} from 'react';
import {AuthoringComponent} from "./components/AuthoringComponent";
import {EngineType} from "./components/engineViews/EngineType";
import {RenderIf} from "./components/RenderIf";
import {LoggingEngineComponent} from "./components/engineViews/LoggingEngineComponent";
import {BabylonEngineComponent} from "./components/engineViews/BabylonEngineComponent";
import {Tab, Tabs} from "react-bootstrap";
import {Spacer} from "./components/Spacer";
import { InteractivityGraphProvider } from './InteractivityGraphContext';

export const App = () => {
  const [engineType, setEngineType] = useState<EngineType>(EngineType.BABYLON);


  return (
    <InteractivityGraphProvider>
        <div style={{width: "100vw", height: "100vh"}}>
 
        <AuthoringComponent/>
    
        <EngineSelector setEngineType={setEngineType}/>

        <Spacer width={0} height={32}/>

        <RenderIf shouldShow={engineType === EngineType.LOGGING}>
             <LoggingEngineComponent/>
        </RenderIf>
        <RenderIf shouldShow={engineType === EngineType.BABYLON}>
            <BabylonEngineComponent/>
        </RenderIf>
      </div>
    </InteractivityGraphProvider>
      
  );
}

interface EngineSelectorProps {
    setEngineType: (engine: EngineType) => void;
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({setEngineType}) => {
    const [activeKey, setActiveKey] = useState('2');
    const handleEngineChange = (key: any) => {
        let engine;
        switch (key) {
            case '1':
                engine = EngineType.LOGGING;
                break;
            case '2':
                engine = EngineType.BABYLON;
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
            <div data-testid={"engine-selector"}>
                <Tabs
                    activeKey={activeKey}
                    onSelect={handleEngineChange}
                >
                    <Tab title={"Logging Engine"} eventKey={1}/>
                    <Tab title={"Babylon Engine"} eventKey={2}/>
                </Tabs>
            </div>
            
        </div>

    );
}
