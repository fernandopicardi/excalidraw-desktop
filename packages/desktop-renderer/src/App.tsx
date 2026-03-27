import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useElectronAPI } from './hooks/useElectronAPI';
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

  const currentFilePathRef = useRef<string | null>(null);

  const handleOpen = useCallback(async () => {
    if (!electronAPI) return;
    const result = await electronAPI.showOpenDialog();
    if (result.canceled || !result.filePaths?.[0]) return;

    const filePath = result.filePaths[0];
    try {
      const content = await electronAPI.readFile(filePath);
      const data = JSON.parse(content);
      const api = excalidrawRef.current;
      if (api) {
        api.updateScene({
          elements: data.elements || [],
        });
        if (data.files) {
          api.addFiles(Object.values(data.files));
        }
      }
      currentFilePathRef.current = filePath;
      setCurrentFileName(
        filePath.split('/').pop()?.split('\\').pop() || 'Untitled'
      );
      setHasUnsavedChanges(false);
    } catch (error) {
      alert('Failed to open file: ' + error);
    }
  }, [electronAPI]);

  const getSceneData = useCallback(() => {
    const api = excalidrawRef.current;
    if (!api) return null;
    return {
      type: 'excalidraw',
      version: 2,
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!electronAPI) return;
    const data = getSceneData();
    if (!data) return;

    let filePath = currentFilePathRef.current;
    if (!filePath) {
      const result = await electronAPI.showSaveDialog();
      if (result.canceled || !result.filePath) return;
      filePath = result.filePath;
      if (!filePath.endsWith('.excalidraw')) {
        filePath += '.excalidraw';
      }
      currentFilePathRef.current = filePath;
      setCurrentFileName(
        filePath.split('/').pop()?.split('\\').pop() || 'Untitled'
      );
    }
    await electronAPI.writeFile(filePath, JSON.stringify(data, null, 2));
    setHasUnsavedChanges(false);
  }, [electronAPI, getSceneData]);

  const handleSaveAs = useCallback(async () => {
    if (!electronAPI) return;
    const result = await electronAPI.showSaveDialog();
    if (result.canceled || !result.filePath) return;

    const data = getSceneData();
    if (!data) return;

    let filePath = result.filePath;
    if (!filePath.endsWith('.excalidraw')) {
      filePath += '.excalidraw';
    }
    await electronAPI.writeFile(filePath, JSON.stringify(data, null, 2));
    currentFilePathRef.current = filePath;
    setCurrentFileName(
      filePath.split('/').pop()?.split('\\').pop() || 'Untitled'
    );
    setHasUnsavedChanges(false);
  }, [electronAPI, getSceneData]);

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
