import React, { useState, useEffect } from 'react';
import { Button, ButtonGroup, ListGroup, Offcanvas, ToggleButton } from 'react-bootstrap';

export type SampleVariant = 'glTF-Binary' | 'glTF';

const SAMPLE_VARIANTS: ReadonlyArray<{ key: SampleVariant; label: string }> = [
  { key: 'glTF-Binary', label: 'GLB' },
  { key: 'glTF', label: 'glTF' },
];
const BASE_REPO_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Test-Assets-Interactivity/main/';
const SAMPLE_BASE_PATH = 'Models/';
const TEST_BASE_PATH = 'Tests/Interactivity/';

/**
 * Represents a single sample model from the repository
 */
export interface Sample {
  label: string;
  name: string;
  description?: string;
  screenshot?: string;
  tags?: string[];
  variants: {
    [key: string]: string;
  };
}

/**
 * Props for the SampleSidebar component
 */
interface SampleSidebarProps {
  onSelectModel: (url: string) => void;
}

/**
 * Sidebar component for loading example models from the glTF-Test-Assets-Interactivity repository
 * 
 * This component provides a side drawer that loads and displays available sample models.
 * When a model is selected, it calls the onSelectModel callback with the model URL.
 */
export const SampleSidebar: React.FC<SampleSidebarProps> = ({ onSelectModel }) => {
  // State to manage the sidebar visibility, data, loading state, and errors
  const [show, setShow] = useState(false);
  const [sampleModels, setSampleModels] = useState<Sample[]>([]);
  const [testModels, setTestModels] = useState<Sample[]>([]);
  const [mathTestModels, setMathTestModels] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<unknown>(null);
  const [preferredVariant, setPreferredVariant] = useState<SampleVariant>('glTF-Binary');

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // Fetch sample data when the sidebar is opened
  const fetchSamples = async () => {
    if (sampleModels.length > 0 && testModels.length > 0) return; // Don't fetch if we already have data
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch sample models
      const sampleResponse = await fetch(
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Test-Assets-Interactivity/main/Models/model-index.json'
      );
      
      if (!sampleResponse.ok) {
        throw new Error(`Failed to fetch samples: ${sampleResponse.status}`);
      }
      
      const sampleData = await sampleResponse.json();
      console.log('Received sample data:', sampleData);
      
      // Fetch test models
      const testResponse = await fetch(
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Test-Assets-Interactivity/main/Tests/Interactivity/test-index.json'
      );
      
      if (!testResponse.ok) {
        throw new Error(`Failed to fetch test assets: ${testResponse.status}`);
      }

            // Fetch test models
      const mathTestResponse = await fetch(
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Test-Assets-Interactivity/main/Tests/Interactivity/mathtests-index.json'
      );
      
      if (!mathTestResponse.ok) {
        throw new Error(`Failed to fetch test assets: ${mathTestResponse.status}`);
      }


      const testData = await testResponse.json();
      console.log('Received test data:', testData);
      const mathTestData = await mathTestResponse.json();
      console.log('Received math test data:', testData);
      
      setDebugData({ samples: sampleData, tests: testData, mathtests : mathTestData });
      
      // Make sure the data is an array before setting it
      if (Array.isArray(sampleData)) {
        setSampleModels(sampleData);
      } else {
        console.error('Received invalid sample data format:', sampleData);
        setSampleModels([]);
      }
      
      if (Array.isArray(testData)) {
        setTestModels(testData);
      } else {
        console.error('Received invalid test data format:', testData);
        setTestModels([]);
      }

      if (Array.isArray(mathTestData)) {
        setMathTestModels(mathTestData);
      } else {
        console.error('Received invalid math test data format:', mathTestData);
        setTestModels([]);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setSampleModels([]);
      setTestModels([]);
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  /**
   * When a sample is selected, construct the full URL and call the onSelectModel callback
   */
  const handleSelectSample = (model: Sample, isTestModel: boolean) => {
    const variant = resolveSampleVariant(model, preferredVariant);
    if (!variant) {
      console.error('Selected model has no loadable glTF variant', model);
      return;
    }

    const modelUrl = buildSampleUrl(model, isTestModel, variant);
    console.log('Loading model:', modelUrl);
    
    onSelectModel(modelUrl);
    handleClose();
  };

  // When the sidebar is opened, fetch the samples
  useEffect(() => {
    if (show) {
      fetchSamples();
    }
  }, [show]);

  return (
    <>
      <Button 
        onClick={handleShow} 
        variant="primary" 
        style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          zIndex: 1030 
        }}
      >
        ☰ Samples and Tests
      </Button>

      <Offcanvas show={show} onHide={handleClose} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Samples and Tests</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
            <>
          <ButtonGroup className="w-100 mb-3" aria-label="Asset format">
            {SAMPLE_VARIANTS.map(({ key, label }) => (
              <ToggleButton
                key={key}
                id={`sample-variant-${key}`}
                type="radio"
                name="sample-variant"
                value={key}
                variant="outline-primary"
                checked={preferredVariant === key}
                onChange={() => setPreferredVariant(key)}
              >
                {label}
              </ToggleButton>
            ))}
          </ButtonGroup>
          {loading && <div>Loading samples...</div>}
          
          {error && (
            <div className="alert alert-danger">
                <>
              <div>{error}</div>
              <div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="mt-2" 
                  onClick={fetchSamples}
                >
                  Retry
                </Button>
              </div>
              {debugData && (
                <div className="mt-3">
                  <details>
                    <summary>Debug Data</summary>
                    <pre className="debug-pre">
                      {JSON.stringify(debugData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </>
            </div>
          )}

          {!loading && !error && sampleModels.length === 0 && testModels.length === 0 && (
            <div>No samples available. Please try again later.</div>
          )}

          {sampleModels.length > 0 && (
            <>
              <h5 className="mt-3 mb-2">Sample Models</h5>
              <a href="https://github.com/KhronosGroup/glTF-Test-Assets-Interactivity" target="_blank">See on GitHub</a>
              <ListGroup>
                {sampleModels.map((model, index) => (
                  <ListGroup.Item 
                    key={index}
                    action 
                    onClick={() => handleSelectSample(model, false)}
                    className="d-flex flex-column align-items-start"
                  >
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">{model.label || model.name}</h6>
                      <VariantBadge model={model} preferredVariant={preferredVariant} />
                    </div>
                    <div>{model.description}</div>
                    {model.screenshot && (
                      <img 
                        src={`${BASE_REPO_URL}${SAMPLE_BASE_PATH}${model.name}/${model.screenshot}`}
                        alt={model.label || model.name} 
                        className="img-fluid mt-2 mb-2" 
                        style={{ maxWidth: '120px', height: 'auto' }}
                      />
                    )}

                    {model.tags && Array.isArray(model.tags) && model.tags.length > 0 && (
                      <div className="mt-1">
                        {model.tags.map((tag, tagIndex) => (
                          <span 
                            key={tagIndex} 
                            className="badge bg-secondary me-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </>
          )}

          {testModels.length > 0 && (
            <>
              <h5 className="mt-4 mb-2">Test Assets</h5>
              <a href="https://github.com/KhronosGroup/glTF-Test-Assets-Interactivity/" target="_blank">See on GitHub</a>
              <ListGroup>
                {testModels.map((model, index) => (
                  <ListGroup.Item 
                    key={index}
                    action 
                    onClick={() => handleSelectSample(model, true)}
                    className="d-flex flex-column align-items-start"
                  >
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">{model.label || model.name}</h6>
                      <VariantBadge model={model} preferredVariant={preferredVariant} />
                    </div>
                    {model.tags && Array.isArray(model.tags) && model.tags.length > 0 && (
                      <div className="mt-1">
                        {model.tags.map((tag, tagIndex) => (
                          <span 
                            key={tagIndex} 
                            className="badge bg-secondary me-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </>
          )}

          
          {mathTestModels.length > 0 && (
            <>
              <h5 className="mt-4 mb-2">Math Test Assets</h5>
              <a href="https://github.com/KhronosGroup/glTF-Test-Assets-Interactivity/" target="_blank">See on GitHub</a>
              <ListGroup>
                {mathTestModels.map((model, index) => (
                  <ListGroup.Item 
                    key={index}
                    action 
                    onClick={() => handleSelectSample(model, true)}
                    className="d-flex flex-column align-items-start"
                  >
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">{model.label || model.name}</h6>
                      <VariantBadge model={model} preferredVariant={preferredVariant} />
                    </div>
                    {model.tags && Array.isArray(model.tags) && model.tags.length > 0 && (
                      <div className="mt-1">
                        {model.tags.map((tag, tagIndex) => (
                          <span 
                            key={tagIndex} 
                            className="badge bg-secondary me-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </>
          )}
          </>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export function resolveSampleVariant(model: Sample, preferredVariant: SampleVariant): SampleVariant | undefined {
  if (model.variants?.[preferredVariant]) return preferredVariant;
  return SAMPLE_VARIANTS.find(({ key }) => model.variants?.[key])?.key;
}

export function buildSampleUrl(model: Sample, isTestModel: boolean, variant: SampleVariant): string {
  const fileName = model.variants[variant];
  if (!fileName) throw new Error(`${model.name} has no ${variant} variant`);
  const basePath = isTestModel ? TEST_BASE_PATH : SAMPLE_BASE_PATH;
  return `${BASE_REPO_URL}${basePath}${model.name}/${variant}/${fileName}`;
}

const VariantBadge: React.FC<{ model: Sample; preferredVariant: SampleVariant }> = ({ model, preferredVariant }) => {
  const variant = resolveSampleVariant(model, preferredVariant);
  const label = SAMPLE_VARIANTS.find(({ key }) => key === variant)?.label;
  return label ? <span className="badge bg-secondary ms-2">{label}</span> : null;
};
