import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useElectronAPI } from './hooks/useElectronAPI';
import './styles/App.css';

const ExcalidrawDesktop: React.FC = () => {
  const [currentFileName, setCurrentFileName] = useState('Untitled');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const excalidrawRef = useRef<any>(null);
  const currentFilePathRef = useRef<string | null>(null);
  const electronAPI = useElectronAPI();

  // Load file data into the Excalidraw scene
  const loadFileContent = useCallback((filePath: string, content: string) => {
    try {
      const data = JSON.parse(content);
      const api = excalidrawRef.current;
      if (api) {
        api.updateScene({
          elements: data.elements || [],
        });
        if (data.files) {
          api.addFiles(Object.values(data.files));
        }
        api.scrollToContent(data.elements || [], { fitToContent: true });
      }
      currentFilePathRef.current = filePath;
      setCurrentFileName(
        filePath.split('/').pop()?.split('\\').pop() || 'Untitled'
      );
      setHasUnsavedChanges(false);
    } catch {
      alert('Failed to parse file. It may not be a valid Excalidraw file.');
    }
  }, []);

  const handleNew = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Create a new file?')) {
        return;
      }
    }
    const api = excalidrawRef.current;
    if (api) {
      api.resetScene();
    }
    currentFilePathRef.current = null;
    setCurrentFileName('Untitled');
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges]);

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
      // No file path yet — behave like Save As
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

  // Register Electron menu event handlers
  useEffect(() => {
    if (!electronAPI) return;

    electronAPI.onMenuNew(handleNew);
    electronAPI.onMenuSave(handleSave);
    electronAPI.onMenuSaveAs(handleSaveAs);
    electronAPI.onMenuImportMermaid(() => {
      const api = excalidrawRef.current;
      if (api) {
        api.setOpenDialog({ name: 'ttd', tab: 'mermaid' });
      }
    });

    // File opened: main process read the file and sends content here
    electronAPI.onFileOpened(loadFileContent);

    return () => {
      electronAPI.removeAllListeners('menu-new');
      electronAPI.removeAllListeners('menu-save');
      electronAPI.removeAllListeners('menu-save-as');
      electronAPI.removeAllListeners('menu-import-mermaid');
      electronAPI.removeAllListeners('file-opened');
    };
  }, [electronAPI, handleNew, handleSave, handleSaveAs, loadFileContent]);

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
