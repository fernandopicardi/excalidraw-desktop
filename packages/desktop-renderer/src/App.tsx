import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { ExcalidrawElement, AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import { MermaidConverter } from './components/MermaidConverter';
import { DesktopMenu } from './components/DesktopMenu';
import { useElectronAPI } from './hooks/useElectronAPI';
import { saveToFile, loadFromFile, ExcalidrawFileData } from './utils/fileUtils';
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
  const [currentFileName, setCurrentFileName] = useState<string>('Untitled');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const excalidrawRef = useRef<any>(null);
  const electronAPI = useElectronAPI();

  // File operations
  const handleNew = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to create a new file?')) {
        setElements([]);
        setFiles({});
        setCurrentFileName('Untitled');
        setHasUnsavedChanges(false);
      }
    } else {
      setElements([]);
      setFiles({});
      setCurrentFileName('Untitled');
      setHasUnsavedChanges(false);
    }
  }, [hasUnsavedChanges]);

  const handleOpen = useCallback(async () => {
    if (electronAPI) {
      const result = await electronAPI.showOpenDialog();
      if (!result.canceled && result.filePaths?.[0]) {
        try {
          const file = new File([], result.filePaths[0]);
          const data = await loadFromFile(file);
          setElements(data.elements);
          setAppState(data.appState);
          setFiles(data.files);
          setCurrentFileName(result.filePaths[0].split('/').pop()?.split('\\').pop() || 'Untitled');
          setHasUnsavedChanges(false);
        } catch (error) {
          alert('Failed to open file: ' + error);
        }
      }
    }
  }, [electronAPI]);

  const handleSave = useCallback(() => {
    const data: ExcalidrawFileData = {
      elements,
      appState: appState as AppState,
      files
    };
    saveToFile(data, currentFileName);
    setHasUnsavedChanges(false);
  }, [elements, appState, files, currentFileName]);

  const handleSaveAs = useCallback(async () => {
    if (electronAPI) {
      const result = await electronAPI.showSaveDialog();
      if (!result.canceled && result.filePath) {
        const data: ExcalidrawFileData = {
          elements,
          appState: appState as AppState,
          files
        };
        saveToFile(data, result.filePath);
        setCurrentFileName(result.filePath.split('/').pop()?.split('\\').pop() || 'Untitled');
        setHasUnsavedChanges(false);
      }
    }
  }, [electronAPI, elements, appState, files]);

  // Handle menu events from Electron
  useEffect(() => {
    if (electronAPI) {
      electronAPI.onMenuNew(handleNew);
      electronAPI.onMenuOpen(handleOpen);
      electronAPI.onMenuSave(handleSave);
      electronAPI.onMenuSaveAs(handleSaveAs);
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
  }, [electronAPI, handleNew, handleOpen, handleSave, handleSaveAs]);

  const handleChange = useCallback((newElements: ExcalidrawElement[], newAppState: AppState, newFiles: BinaryFiles) => {
    setElements(newElements);
    setAppState(newAppState);
    setFiles(newFiles);
    setHasUnsavedChanges(true);
  }, []);

  const handleMermaidConvert = useCallback((mermaidElements: ExcalidrawElement[]) => {
    setElements(prev => [...prev, ...mermaidElements]);
    setIsMermaidModalOpen(false);
    setHasUnsavedChanges(true);
  }, []);

  return (
    <div className="excalidraw-desktop">
      <DesktopMenu 
        onImportMermaid={() => setIsMermaidModalOpen(true)}
        onNew={handleNew}
        onSave={handleSave}
        onOpen={handleOpen}
        fileName={currentFileName}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      <div className="excalidraw-container">
        <Excalidraw
          ref={excalidrawRef}
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
