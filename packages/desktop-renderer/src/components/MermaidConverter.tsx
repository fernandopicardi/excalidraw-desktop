import React, { useState, useCallback } from 'react';
import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/types';
import './MermaidConverter.css';

interface MermaidConverterProps {
  onConvert: (elements: ExcalidrawElement[]) => void;
  onClose: () => void;
}

const MermaidConverter: React.FC<MermaidConverterProps> = ({ onConvert, onClose }) => {
  const [mermaidCode, setMermaidCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExcalidrawElement[]>([]);

  const exampleMermaid = `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]`;

  const handleConvert = useCallback(async () => {
    if (!mermaidCode.trim()) {
      setError('Please enter Mermaid code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { elements } = await parseMermaidToExcalidraw(mermaidCode, {
        themeVariables: {
          fontSize: '16px'
        }
      });
      
      setPreview(elements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Mermaid diagram');
    } finally {
      setIsLoading(false);
    }
  }, [mermaidCode]);

  const handleInsert = useCallback(() => {
    if (preview.length > 0) {
      onConvert(preview);
    }
  }, [preview, onConvert]);

  const handleExample = useCallback(() => {
    setMermaidCode(exampleMermaid);
    setError(null);
  }, []);

  return (
    <div className="mermaid-converter-overlay">
      <div className="mermaid-converter-modal">
        <div className="mermaid-converter-header">
          <h2>Import Mermaid Diagram</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="mermaid-converter-content">
          <div className="input-section">
            <label htmlFor="mermaid-code">Mermaid Code:</label>
            <textarea
              id="mermaid-code"
              value={mermaidCode}
              onChange={(e) => setMermaidCode(e.target.value)}
              placeholder="Enter your Mermaid diagram code here..."
              rows={10}
            />
            
            <div className="button-group">
              <button onClick={handleExample} disabled={isLoading}>
                Load Example
              </button>
              <button 
                onClick={handleConvert} 
                disabled={isLoading || !mermaidCode.trim()}
                className="convert-button"
              >
                {isLoading ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div className="preview-section">
              <h3>Preview ({preview.length} elements)</h3>
              <div className="preview-info">
                <p>Elements will be added to your canvas</p>
                <button 
                  onClick={handleInsert}
                  className="insert-button"
                >
                  Insert into Canvas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { MermaidConverter };
