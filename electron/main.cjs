const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, fork, exec } = require('child_process');
const { initPythonVideoProcessor } = require('./ipc/pythonVideoProcessor.cjs');

let mainWindow = null;
let backendProcess = null;
let pythonProcessor = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const BACKEND_PORT = process.env.PORT || 5000;

/**
 * Start the local Node.js backend daemon process
 */
function startBackendDaemon() {
  try {
    const backendPath = isDev
      ? path.join(__dirname, '../backend/src/server.js')
      : path.join(process.resourcesPath, 'backend/src/server.js');

    console.log('[Electron Main] Starting Backend Daemon from:', backendPath);

    backendProcess = fork(backendPath, [], {
      env: {
        ...process.env,
        PORT: String(BACKEND_PORT),
        NODE_ENV: isDev ? 'development' : 'production',
        ELECTRON_RUN_AS_NODE: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => {
        console.log(`[Backend Daemon] ${data.toString().trim()}`);
      });
    }

    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (data) => {
        console.error(`[Backend Daemon Error] ${data.toString().trim()}`);
      });
    }

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Backend Daemon] Exited with code ${code}, signal ${signal}`);
    });
  } catch (err) {
    console.error('[Electron Main] Failed to spawn Backend Daemon:', err);
  }
}

/**
 * Stop backend daemon on app close
 */
function stopBackendDaemon() {
  if (backendProcess) {
    console.log('[Electron Main] Terminating Backend Daemon...');
    try {
      backendProcess.kill('SIGTERM');
    } catch {
      // Process already dead
    }
    backendProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Custom frameless obsidian window
    titleBarStyle: 'hidden',
    backgroundColor: '#07090f',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      devTools: isDev
    }
  });

  // Load URL or local index.html
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Window control IPC events from custom titlebar
  ipcMain.on('window-control', (event, action) => {
    if (!mainWindow) return;
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.close();
        break;
    }
  });

  // Self-Healing Trigger from UI Layer Heartbeat Monitor
  ipcMain.handle('restart-daemon', async () => {
    console.log('[Electron Main] Self-Healing requested by UI Heartbeat Monitor...');
    stopBackendDaemon();
    await new Promise((resolve) => setTimeout(resolve, 800));
    startBackendDaemon();
    return { success: true, restartedAt: new Date().toISOString() };
  });

  // Native Open File or Folder on Desktop System
  ipcMain.handle('open-file', async (event, filePath) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
        return { success: true, path: filePath };
      }
      
      const dir = filePath ? path.dirname(filePath) : path.join(app.getPath('downloads'), 'CreatorOS');
      if (fs.existsSync(dir)) {
        await shell.openPath(dir);
        return { success: true, path: dir };
      }

      fs.mkdirSync(dir, { recursive: true });
      await shell.openPath(dir);
      return { success: true, path: dir };
    } catch (err) {
      console.error('[Electron Main] open-file error:', err);
      return { success: false, error: err.message };
    }
  });

  // Just-In-Time Elevation API (Windows UAC / macOS Administrator Authorization)
  ipcMain.handle('execute-elevated', async (event, command) => {
    console.log('[Electron Main] Requesting Elevated Execution:', command);
    return new Promise((resolve) => {
      const platform = process.platform;
      let elevatedCmd = '';

      if (platform === 'win32') {
        // Escaping single quotes for PowerShell Start-Process RunAs
        const escapedCmd = command.replace(/'/g, "''");
        elevatedCmd = `powershell -Command "Start-Process cmd -ArgumentList '/c ${escapedCmd}' -Verb RunAs -WindowStyle Hidden"`;
      } else if (platform === 'darwin') {
        const escapedCmd = command.replace(/"/g, '\\"');
        elevatedCmd = `osascript -e 'do shell script "${escapedCmd}" with administrator privileges'`;
      } else {
        // Linux fallback (pkexec)
        elevatedCmd = `pkexec ${command}`;
      }

      exec(elevatedCmd, (error, stdout, stderr) => {
        if (error) {
          console.error('[Electron Main] Elevated Command Failed:', error.message);
          resolve({ success: false, error: error.message, stderr: stderr ? stderr.toString() : '' });
        } else {
          console.log('[Electron Main] Elevated Command Executed Successfully');
          resolve({ success: true, output: stdout ? stdout.toString() : '' });
        }
      });
    });
  });

  // Check if current electron process has admin privileges
  ipcMain.handle('check-is-elevated', async () => {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('net session', (err) => {
          resolve({ isElevated: !err });
        });
      } else {
        resolve({ isElevated: process.getuid ? process.getuid() === 0 : false });
      }
    });
  });

  // Video Rendering & Batch Downloader IPC handlers
  ipcMain.handle('render-video', async (event, config) => {
    console.log('[Electron Main] render-video invoked:', config);
    return { success: true, message: 'Rendering initiated via Electron Main.' };
  });

  ipcMain.handle('cancel-render', async () => {
    console.log('[Electron Main] cancel-render invoked');
    return { success: true, message: 'Rendering cancelled.' };
  });

  ipcMain.handle('scrape-videos', async (event, config) => {
    console.log('[Electron Main] scrape-videos invoked:', config);
    return { success: true, videos: [], count: 0 };
  });

  ipcMain.handle('download-videos', async (event, videos) => {
    console.log('[Electron Main] download-videos invoked:', videos);
    return { success: true, downloadedCount: Array.isArray(videos) ? videos.length : 0 };
  });

  // Open external URLs in default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  startBackendDaemon();
  pythonProcessor = initPythonVideoProcessor();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  if (pythonProcessor) {
    await pythonProcessor.cleanup();
  }
  stopBackendDaemon();
});

app.on('window-all-closed', () => {
  stopBackendDaemon();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
