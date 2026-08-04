import React, {useRef, useState, useEffect} from 'react';
import {AuthoringComponent} from "./components/AuthoringComponent";
import {EngineType} from "./components/engineViews/EngineType";
import {RenderIf} from "./components/RenderIf";
import {LoggingEngineComponent} from "./components/engineViews/LoggingEngineComponent";
import {BabylonEngineComponent} from "./components/engineViews/BabylonEngineComponent";
import { InteractivityGraphProvider } from './InteractivityGraphContext';
import { SampleSidebar } from './components/SampleSidebar';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';

// Storage key for persisting the engine type
const ENGINE_TYPE_STORAGE_KEY = 'interactivity-graph-engine-type';
// Storage key for persisting which workspace panes are shown
const VIEW_MODE_STORAGE_KEY = 'interactivity-graph-view-mode';

// which workspace pane(s) are visible: the 3D/logging engine view, the graph authoring view, or
// both side by side (the default)
type ViewMode = 'scene' | 'graph' | 'both';

const viewModeFromString = (value: string | null): ViewMode | undefined => {
  switch (value?.toLowerCase()) {
    case 'scene': return 'scene';
    case 'graph': return 'graph';
    case 'both': return 'both';
    default: return undefined;
  }
};

export const App = () => {
  const [engineType, setEngineType] = useState<EngineType>(EngineType.BABYLON);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  // which pane(s) of the workspace are shown — hiding a pane leaves it mounted (see
  // app-split__pane--hidden) so switching back doesn't pay for rebuilding the canvas or graph
  // from scratch.
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  // fraction of the split row's width given to the left (engine) panel; the divider drags this
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [dividerHovered, setDividerHovered] = useState(false);
  const [dividerDragging, setDividerDragging] = useState(false);
  const splitRowRef = useRef<HTMLDivElement | null>(null);

  // drag the divider: track the pointer against the row's bounds and clamp so neither panel collapses
  const startSplitDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setDividerDragging(true);
    const onMove = (ev: MouseEvent) => {
      const bounds = splitRowRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width === 0) { return; }
      const ratio = (ev.clientX - bounds.left) / bounds.width;
      setSplitRatio(Math.min(0.85, Math.max(0.15, ratio)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      setDividerDragging(false);
    };
    // suppress text selection while dragging
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // divider highlights on hover, and stays highlighted (wider grip + accent color) while dragging
  const dividerActive = dividerHovered || dividerDragging;

  // Load stored engine type on initial render and check URL parameters
  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const engineParam = params.get('engine');
    const modelParam = params.get('model');

    // Set engine type from URL parameter or localStorage
    if (engineParam) {
      switch (engineParam.toLowerCase()) {
        case 'logging':
          setEngineType(EngineType.LOGGING);
          break;
        case 'babylon':
          setEngineType(EngineType.BABYLON);
          break;
        default:
          // Load from localStorage if URL param is invalid
          const storedEngineType = localStorage.getItem(ENGINE_TYPE_STORAGE_KEY);
          if (storedEngineType && Object.values(EngineType).includes(storedEngineType as EngineType)) {
            setEngineType(storedEngineType as EngineType);
          }
      }
    } else {
      // No URL param, load from localStorage
      const storedEngineType = localStorage.getItem(ENGINE_TYPE_STORAGE_KEY);
      if (storedEngineType && Object.values(EngineType).includes(storedEngineType as EngineType)) {
        setEngineType(storedEngineType as EngineType);
      }
    }

    // Set model URL from URL parameter
    if (modelParam) {
      setModelUrl(modelParam);
    }

    // View mode: URL parameter wins over the stored preference, so a "?view=scene" link opens
    // straight into the viewer-only layout
    const viewParam = viewModeFromString(params.get('view'));
    if (viewParam) {
      setViewMode(viewParam);
    } else {
      const storedViewMode = viewModeFromString(localStorage.getItem(VIEW_MODE_STORAGE_KEY));
      if (storedViewMode) {
        setViewMode(storedViewMode);
      }
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Get the model URL from the URL parameters
      const params = new URLSearchParams(window.location.search);
      const modelParam = params.get('model');
      const engineParam = params.get('engine');
      
      // Update the model URL state if it exists in the URL
      if (modelParam) {
        setModelUrl(modelParam);
      }
      
      // Update engine type if needed
      if (engineParam) {
        switch (engineParam.toLowerCase()) {
          case 'logging':
            setEngineType(EngineType.LOGGING);
            break;
          case 'babylon':
            setEngineType(EngineType.BABYLON);
            break;
        }
      }
    };

    // Add event listener for popstate
    window.addEventListener('popstate', handlePopState);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Save engine type when it changes
  const handleEngineTypeChange = (type: EngineType) => {
    setEngineType(type);
    localStorage.setItem(ENGINE_TYPE_STORAGE_KEY, type);
    
    // Update URL with engine type
    const params = new URLSearchParams(window.location.search);
    params.set('engine', type.toLowerCase());
    // Keep model parameter if it exists
    if (modelUrl) {
      params.set('model', modelUrl);
    }
    window.history.pushState({ engineType: type, modelUrl }, '', `${window.location.pathname}?${params}`);
  };

  const handleModelUrlChange = (url: string) => {
    setModelUrl(url);
  };

  useEffect(() => {
    if (modelUrl) {
      const params = new URLSearchParams(window.location.search);
      params.set('model', modelUrl);
      // set title based on model name
      const modelName = modelUrl.split('/').pop()?.split('.').shift();
      if (modelName) {
        document.title = `${modelName}`;
      } else {
        document.title = 'glTF Interactivity';
      }
      // only push state if modelUrl is different from current URL parameter
      const currentModelParam = new URLSearchParams(window.location.search).get('model');
      if (currentModelParam !== modelUrl) {
        // Update the URL without reloading the page
        window.history.pushState({ modelUrl }, '', `${window.location.pathname}?${params}`);
      }
    }
  }, [modelUrl]);

  return (
    <InteractivityGraphProvider>
      <div className={"app-shell"}>
        <AppHeader
          setEngineType={handleEngineTypeChange}
          currentEngineType={engineType}
          onSelectModel={handleModelUrlChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        {/* side-by-side, resizable: 3D/logging engine view on the left, graph authoring on the
            right, with a draggable divider controlling the split (see startSplitDrag) */}
        <main className={"app-main"}>
          <div ref={splitRowRef} className={"app-split"}>
            {/* with the graph pane hidden the engine pane is the only flex item, and a grow factor
                below 1 would leave the rest of the row empty — give it the full width instead */}
            <div
                className={`app-split__pane${viewMode === "graph" ? " app-split__pane--hidden" : ""}`}
                style={{flexGrow: viewMode === "both" ? splitRatio : 1}}
            >
                <RenderIf shouldShow={engineType === EngineType.LOGGING}>
                     <LoggingEngineComponent modelUrl={modelUrl} />
                </RenderIf>
                <RenderIf shouldShow={engineType === EngineType.BABYLON}>
                    <BabylonEngineComponent modelUrl={modelUrl} />
                </RenderIf>
            </div>
            <RenderIf shouldShow={viewMode === "both"}>
                <div
                    role={"separator"}
                    aria-orientation={"vertical"}
                    onMouseDown={startSplitDrag}
                    onMouseEnter={() => setDividerHovered(true)}
                    onMouseLeave={() => setDividerHovered(false)}
                    title={"Drag to resize"}
                    className={`app-divider${dividerActive ? " is-active" : ""}`}
                >
                    <div className={"app-divider__grip"}/>
                </div>
            </RenderIf>
            <div
                className={`app-split__pane${viewMode === "scene" ? " app-split__pane--hidden" : ""}`}
                style={{flexGrow: viewMode === "both" ? 1 - splitRatio : 1}}
            >
                <AuthoringComponent/>
            </div>
          </div>
        </main>

        {/* below the workspace so it never pushes it down on load; renders nothing (and takes no
            space) while there are no diagnostics */}
        <DiagnosticsPanel />
      </div>
    </InteractivityGraphProvider>
  );
}

interface EngineSelectorProps {
    setEngineType: (engine: EngineType) => void;
    currentEngineType: EngineType;
}

// the engine tabs, kept in the order Babylon-then-Logging. Rendered as a plain <ul>/<li>
// segmented control rather than react-bootstrap's <Tabs> so it can carry the app's own styling
// (and so a tab is still an <li>, which the e2e spec clicks).
const ENGINE_TABS: ReadonlyArray<{ engine: EngineType; label: string }> = [
    { engine: EngineType.BABYLON, label: "Babylon Engine" },
    { engine: EngineType.LOGGING, label: "Logging Engine" },
];

export const EngineSelector: React.FC<EngineSelectorProps> = ({ setEngineType, currentEngineType }) => (
    <div data-testid={"engine-selector"}>
        <ul className={"app-tabs"} role={"tablist"}>
            {ENGINE_TABS.map(({ engine, label }) => {
                const isActive = currentEngineType === engine;
                return (
                    <li
                        key={engine}
                        role={"presentation"}
                        className={`app-tab${isActive ? " is-active" : ""}`}
                        onClick={() => setEngineType(engine)}
                    >
                        <button type={"button"} role={"tab"} aria-selected={isActive}>{label}</button>
                    </li>
                );
            })}
        </ul>
    </div>
);

interface ViewModeSelectorProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
}

// the workspace pane tabs, styled as the same segmented control as the engine selector
const VIEW_MODE_TABS: ReadonlyArray<{ mode: ViewMode; label: string; title: string }> = [
    { mode: "scene", label: "3D Scene", title: "Show only the engine view" },
    { mode: "graph", label: "Graph", title: "Show only the graph authoring panel" },
    { mode: "both", label: "Both", title: "Show the engine view and the graph authoring panel side by side" },
];

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ viewMode, onViewModeChange }) => (
    <div data-testid={"view-mode-selector"}>
        <ul className={"app-tabs"} role={"tablist"}>
            {VIEW_MODE_TABS.map(({ mode, label, title }) => {
                const isActive = viewMode === mode;
                return (
                    <li
                        key={mode}
                        role={"presentation"}
                        className={`app-tab${isActive ? " is-active" : ""}`}
                        onClick={() => onViewModeChange(mode)}
                    >
                        <button type={"button"} role={"tab"} aria-selected={isActive} title={title}>{label}</button>
                    </li>
                );
            })}
        </ul>
    </div>
);

interface AppHeaderProps extends EngineSelectorProps, ViewModeSelectorProps {
    onSelectModel: (url: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ setEngineType, currentEngineType, onSelectModel, viewMode, onViewModeChange }) => (
    <header className={"app-header"}>
        <div className={"app-header__brand"}>
            <h1 className={"app-title"}>glTF Interactivity Editor and Viewer</h1>
            <p className={"app-subtitle"}>
                Inspect, run and author glTF files using the{" "}
                <a href="https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_interactivity/Specification.adoc" target="_blank" rel="noreferrer">KHR_interactivity</a>
                {" "}extension — load a sample or test asset, or build your own graph.
            </p>
        </div>
        <div className={"app-header__actions"}>
            <EngineSelector setEngineType={setEngineType} currentEngineType={currentEngineType} />
            <ViewModeSelector viewMode={viewMode} onViewModeChange={onViewModeChange} />
            <SampleSidebar onSelectModel={onSelectModel} />
        </div>
    </header>
);
