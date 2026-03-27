import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useElectronAPI } from './hooks/useElectronAPI';
import './styles/App.css';

interface PendingFile {
  filePath: string;
  data: any;
}

const ExcalidrawDesktop: React.FC = () => {
  const [currentFileName, setCurrentFileName] = useState('Untitled');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const excalidrawRef = useRef<any>(null);
  const currentFilePathRef = useRef<string | null>(null);
  const pendingFileRef = useRef<PendingFile | null>(null);
  const electronAPI = useElectronAPI();

  // Apply file data to the Excalidraw scene (only when API is ready)
  const applyFileToScene = useCallback((filePath: string, data: any) => {
    const api = excalidrawRef.current;
    if (!api) {
      // API not ready yet — store for later
      console.log('[ExcalidrawDesktop] API not ready, queuing file for later');
      pendingFileRef.current = { filePath, data };
      return;
    }

    console.log('[ExcalidrawDesktop] Applying', data.elements?.length, 'elements to scene');
    api.updateScene({
      elements: data.elements || [],
    });
    if (data.files) {
      api.addFiles(Object.values(data.files));
    }
    api.scrollToContent(data.elements || [], { fitToContent: true });

    currentFilePathRef.current = filePath;
    setCurrentFileName(
      filePath.split('/').pop()?.split('\\').pop() || 'Untitled'
    );
    setHasUnsavedChanges(false);
    pendingFileRef.current = null;
  }, []);

  // Handle file-opened event from main process
  const handleFileOpened = useCallback((filePath: string, content: string) => {
    console.log('[ExcalidrawDesktop] file-opened received, path:', filePath, 'length:', content?.length);
    try {
      const data = JSON.parse(content);
      applyFileToScene(filePath, data);
    } catch (err) {
      console.error('[ExcalidrawDesktop] Failed to parse file:', err);
      alert('Failed to open file. It may not be a valid Excalidraw file.');
    }
  }, [applyFileToScene]);

  // Excalidraw ref callback — fires when the component mounts
  const excalidrawRefCallback = useCallback((api: any) => {
    excalidrawRef.current = api;
    if (api && pendingFileRef.current) {
      // A file was received before the API was ready — apply it now
      console.log('[ExcalidrawDesktop] API ready, applying pending file');
      const { filePath, data } = pendingFileRef.current;
      applyFileToScene(filePath, data);
    }
  }, [applyFileToScene]);

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
    electronAPI.onFileOpened(handleFileOpened);

    return () => {
      electronAPI.removeAllListeners('menu-new');
      electronAPI.removeAllListeners('menu-save');
      electronAPI.removeAllListeners('menu-save-as');
      electronAPI.removeAllListeners('menu-import-mermaid');
      electronAPI.removeAllListeners('file-opened');
    };
  }, [electronAPI, handleNew, handleSave, handleSaveAs, handleFileOpened]);

  const handleChange = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  return (
    <div className="excalidraw-desktop">
      <div className="excalidraw-container">
        <Excalidraw
          ref={excalidrawRefCallback}
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
