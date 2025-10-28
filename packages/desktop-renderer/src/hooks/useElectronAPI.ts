import { useEffect, useState } from 'react';

// Type definitions for Electron API
interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  showSaveDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths?: string[] }>;
  onMenuNew: (callback: () => void) => void;
  onMenuOpen: (callback: (event: any, filePath: string) => void) => void;
  onMenuSave: (callback: () => void) => void;
  onMenuSaveAs: (callback: () => void) => void;
  onMenuImportMermaid: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const useElectronAPI = () => {
  const [electronAPI, setElectronAPI] = useState<ElectronAPI | null>(null);

  useEffect(() => {
    // Check if we're running in Electron
    if (window.electronAPI) {
      setElectronAPI(window.electronAPI);
    } else {
      // Running in browser (development mode)
      console.log('Running in browser mode - Electron API not available');
    }
  }, []);

  return electronAPI;
};
