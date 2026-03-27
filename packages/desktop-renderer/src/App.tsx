import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useElectronAPI } from './hooks/useElectronAPI';
import { saveToFile, loadFromFile } from './utils/fileUtils';
import './styles/App.css';

const ExcalidrawDesktop: React.FC = () => {
  const [currentFileName, setCurrentFileName] = useState('Untitled');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const excalidrawRef = useRef<any>(null);
  const electronAPI = useElectronAPI();

  const handleNew = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to create a new file?')) {
        return;
      }
    }
    const api = excalidrawRef.current;
    if (api) {
      api.resetScene();
    }
    setCurrentFileName('Untitled');
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges]);

  const handleOpen = useCallback(async () => {
    if (!electronAPI) return;
    const result = await electronAPI.showOpenDialog();
    if (result.canceled || !result.filePaths?.[0]) return;

    try {
      const file = new File([], result.filePaths[0]);
      const data = await loadFromFile(file);
      const api = excalidrawRef.current;
      if (api) {
        api.updateScene({
          elements: data.elements,
        });
        api.addFiles(Object.values(data.files || {}));
      }
      setCurrentFileName(
        result.filePaths[0].split('/').pop()?.split('\\').pop() || 'Untitled'
      );
      setHasUnsavedChanges(false);
    } catch (error) {
      alert('Failed to open file: ' + error);
    }
  }, [electronAPI]);

  const handleSave = useCallback(() => {
    const api = excalidrawRef.current;
    if (!api) return;
    const data = {
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
    };
    saveToFile(data, currentFileName);
    setHasUnsavedChanges(false);
  }, [currentFileName]);

  const handleSaveAs = useCallback(async () => {
    if (!electronAPI) return;
    const result = await electronAPI.showSaveDialog();
    if (result.canceled || !result.filePath) return;

    const api = excalidrawRef.current;
    if (!api) return;
    const data = {
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
    };
    saveToFile(data, result.filePath);
    setCurrentFileName(
      result.filePath.split('/').pop()?.split('\\').pop() || 'Untitled'
    );
    setHasUnsavedChanges(false);
  }, [electronAPI]);

  useEffect(() => {
    if (!electronAPI) return;

    electronAPI.onMenuNew(handleNew);
    electronAPI.onMenuOpen(handleOpen);
    electronAPI.onMenuSave(handleSave);
    electronAPI.onMenuSaveAs(handleSaveAs);
    electronAPI.onMenuImportMermaid(() => {
      // Trigger the built-in Mermaid dialog via Excalidraw API
      const api = excalidrawRef.current;
      if (api) {
        api.setOpenDialog({ name: 'ttd', tab: 'mermaid' });
      }
    });

    return () => {
      electronAPI.removeAllListeners('menu-new');
      electronAPI.removeAllListeners('menu-open');
      electronAPI.removeAllListeners('menu-save');
      electronAPI.removeAllListeners('menu-save-as');
      electronAPI.removeAllListeners('menu-import-mermaid');
    };
  }, [electronAPI, handleNew, handleOpen, handleSave, handleSaveAs]);

  const handleChange = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  return (
    <div className="excalidraw-desktop">
      <div className="excalidraw-container">
        <Excalidraw
          ref={excalidrawRef}
          initialData={{
            appState: {
              viewBackgroundColor: '#ffffff',
              theme: 'light',
            },
          }}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              toggleTheme: true,
            },
          }}
        />
      </div>
    </div>
  );
};

export default ExcalidrawDesktop;
