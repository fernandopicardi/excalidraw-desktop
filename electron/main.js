const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let fileToOpenOnReady = null;

// Check if launched with a file argument (double-click on .excalidraw file)
const fileArg = process.argv.find(arg =>
  arg.endsWith('.excalidraw') && !arg.startsWith('-')
);
if (fileArg && fs.existsSync(fileArg)) {
  fileToOpenOnReady = path.resolve(fileArg);
}

function openFileInRenderer(filePath) {
  if (!mainWindow || !filePath) return;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('file-opened', filePath, content);
  } catch (err) {
    dialog.showErrorBox('Failed to open file', err.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, process.platform === 'darwin'
      ? '../assets/icon.icns'
      : '../assets/icon.ico'),
    titleBarStyle: 'default',
    show: false
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl).catch(err => {
    console.error('Failed to load URL:', err);
    mainWindow.loadURL(`data:text/html,<h1>Loading Error</h1><p>${err.message}</p>`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // If launched with a file argument, open it after the app is ready
    if (fileToOpenOnReady) {
      // Small delay to ensure renderer is fully initialized
      setTimeout(() => openFileInRenderer(fileToOpenOnReady), 500);
      fileToOpenOnReady = null;
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS: handle file open via Finder / double-click
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    openFileInRenderer(filePath);
  } else {
    fileToOpenOnReady = filePath;
  }
});

// Windows: handle second instance with file argument
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const file = argv.find(arg =>
      arg.endsWith('.excalidraw') && !arg.startsWith('-')
    );
    if (file && fs.existsSync(file)) {
      openFileInRenderer(path.resolve(file));
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new')
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Excalidraw Files', extensions: ['excalidraw'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            if (!result.canceled && result.filePaths[0]) {
              openFileInRenderer(result.filePaths[0]);
            }
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-as')
        },
        { type: 'separator' },
        {
          label: 'Import Mermaid',
          accelerator: 'CmdOrCtrl+M',
          click: () => mainWindow.webContents.send('menu-import-mermaid')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('show-save-dialog', async () => {
  return dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Excalidraw Files', extensions: ['excalidraw'] },
      { name: 'PNG Images', extensions: ['png'] },
      { name: 'SVG Images', extensions: ['svg'] }
    ]
  });
});
