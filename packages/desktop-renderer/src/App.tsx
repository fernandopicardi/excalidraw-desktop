import React, { useState, useCallback, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ExcalidrawElement, AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import { MermaidConverter } from './components/MermaidConverter';
import { DesktopMenu } from './components/DesktopMenu';
import { useElectronAPI } from './hooks/useElectronAPI';
import './styles/App.css';

interface ExcalidrawDesktopProps {}

const ExcalidrawDesktop: React.FC<ExcalidrawDesktopProps> = () => {
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [appState, setAppState] = useState<Partial<AppState>>({
    viewBackgroundColor: '#ffffff',
    theme: 'light'
  });
  const [files, setFiles] = useState<BinaryFiles>({});
  const [isMermaidModalOpen, setIsMermaidModalOpen] = useState(false);
  
  const electronAPI = useElectronAPI();

  // Handle menu events from Electron
  useEffect(() => {
    if (electronAPI) {
      electronAPI.onMenuNew(() => {
        setElements([]);
        setFiles({});
      });

      electronAPI.onMenuOpen((event, filePath) => {
        // TODO: Implement file loading
        console.log('Open file:', filePath);
      });

      electronAPI.onMenuSave(() => {
        // TODO: Implement file saving
        console.log('Save file');
      });

      electronAPI.onMenuSaveAs(() => {
        // TODO: Implement save as
        console.log('Save as file');
      });

      electronAPI.onMenuImportMermaid(() => {
        setIsMermaidModalOpen(true);
      });
    }

    return () => {
      if (electronAPI) {
        electronAPI.removeAllListeners('menu-new');
        electronAPI.removeAllListeners('menu-open');
        electronAPI.removeAllListeners('menu-save');
        electronAPI.removeAllListeners('menu-save-as');
        electronAPI.removeAllListeners('menu-import-mermaid');
      }
    };
  }, [electronAPI]);

  const handleChange = useCallback((newElements: ExcalidrawElement[], newAppState: AppState, newFiles: BinaryFiles) => {
    setElements(newElements);
    setAppState(newAppState);
    setFiles(newFiles);
  }, []);

  const handleMermaidConvert = useCallback((mermaidElements: ExcalidrawElement[]) => {
    setElements(prev => [...prev, ...mermaidElements]);
    setIsMermaidModalOpen(false);
  }, []);

  return (
    <div className="excalidraw-desktop">
      <DesktopMenu 
        onImportMermaid={() => setIsMermaidModalOpen(true)}
        onNew={() => setElements([])}
        onSave={() => console.log('Save')}
        onOpen={() => console.log('Open')}
      />
      
      <div className="excalidraw-container">
        <Excalidraw
          elements={elements}
          onChange={handleChange}
          initialData={{
            appState: appState as AppState,
            files
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              toggleTheme: true
            }
          }}
        />
      </div>

      {isMermaidModalOpen && (
        <MermaidConverter
          onConvert={handleMermaidConvert}
          onClose={() => setIsMermaidModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ExcalidrawDesktop;
