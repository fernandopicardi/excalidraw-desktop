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
  const apiReadyRef = useRef(false);
  const electronAPI = useElectronAPI();

  // Apply file data to the Excalidraw scene (only when API is ready)
  const applyFileToScene = useCallback((filePath: string, data: any) => {
    const api = excalidrawRef.current;
    if (!api) {
      // API not ready yet — store and poll until ready
      console.log('[ExcalidrawDesktop] API not ready, queuing file and polling...');
      pendingFileRef.current = { filePath, data };
      const interval = setInterval(() => {
        if (excalidrawRef.current) {
          clearInterval(interval);
          console.log('[ExcalidrawDesktop] API became ready, applying queued file');
          const pending = pendingFileRef.current;
          if (pending) {
            pendingFileRef.current = null;
            applyFileToScene(pending.filePath, pending.data);
          }
        }
      }, 200);
      // Safety: stop polling after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);
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
    console.log('[ExcalidrawDesktop] ref callback fired, api:', !!api);
    excalidrawRef.current = api;
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

  const handleChange = useCallback((...args: any[]) => {
    // The first onChange call confirms Excalidraw is fully mounted
    // Use the excalidrawAPI from the ref callback or detect it here
    if (!apiReadyRef.current && excalidrawRef.current) {
      apiReadyRef.current = true;
      console.log('[ExcalidrawDesktop] API confirmed ready via onChange');
    }
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
