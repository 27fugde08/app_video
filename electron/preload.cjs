const { contextBridge, ipcRenderer } = require('electron');

/**
 * CreatorOS Desktop - Secure IPC Preload Bridge
 * Strictly adheres to Electron Security Best Practices:
 * - nodeIntegration: false
 * - contextIsolation: true
 * - Never exposes raw ipcRenderer or require() to Renderer
 * - Whitelists allowed IPC channels & wraps them in safe functions
 */

// Whitelisted invoke channels
const ALLOWED_INVOKE_CHANNELS = new Set([
  'restart-daemon',
  'open-file',
  'execute-elevated',
  'check-is-elevated',
  'download-videos',
  'scrape-videos',
  'render-video',
  'cancel-render'
]);

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,

  // Window Controls (Frameless Titlebar)
  windowControl: (action) => {
    if (['minimize', 'maximize', 'close'].includes(action)) {
      ipcRenderer.send('window-control', action);
    }
  },

  // Daemon & System Controls
  restartDaemon: () => ipcRenderer.invoke('restart-daemon'),
  openFile: (filePath) => {
    if (typeof filePath === 'string' || !filePath) {
      return ipcRenderer.invoke('open-file', filePath);
    }
    return Promise.reject(new Error('Invalid filePath parameter'));
  },
  executeElevated: (command) => {
    if (typeof command === 'string' && command.trim().length > 0) {
      return ipcRenderer.invoke('execute-elevated', command);
    }
    return Promise.reject(new Error('Invalid command parameter'));
  },
  checkIsElevated: () => ipcRenderer.invoke('check-is-elevated'),

  // Whitelisted IPC Invoke Wrapper
  invoke: (channel, ...args) => {
    if (typeof channel === 'string' && ALLOWED_INVOKE_CHANNELS.has(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Unauthorized IPC channel: ${String(channel)}`));
  },

  // Video Render & Batch Downloader IPC Wrappers
  renderVideo: (config) => ipcRenderer.invoke('render-video', config),
  cancelRender: () => ipcRenderer.invoke('cancel-render'),
  scrapeVideos: (config) => ipcRenderer.invoke('scrape-videos', config),
  downloadVideos: (videos) => ipcRenderer.invoke('download-videos', videos),

  // Event Listeners with Safe Unsubscribe Cleanup Callbacks
  onRenderProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('render-progress', handler);
    return () => ipcRenderer.removeListener('render-progress', handler);
  },
  onRenderLog: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('render-log', handler);
    return () => ipcRenderer.removeListener('render-log', handler);
  },
  onRenderComplete: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('render-complete', handler);
    return () => ipcRenderer.removeListener('render-complete', handler);
  },
  onRenderError: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('render-error', handler);
    return () => ipcRenderer.removeListener('render-error', handler);
  },
  onRenderStageUpdate: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('render-stage-update', handler);
    return () => ipcRenderer.removeListener('render-stage-update', handler);
  },
  onHardwareMetrics: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('hardware-metrics', handler);
    return () => ipcRenderer.removeListener('hardware-metrics', handler);
  },
  removeRenderListeners: () => {
    ipcRenderer.removeAllListeners('render-progress');
    ipcRenderer.removeAllListeners('render-log');
    ipcRenderer.removeAllListeners('render-complete');
    ipcRenderer.removeAllListeners('render-error');
    ipcRenderer.removeAllListeners('render-stage-update');
  },

  // Python Video Processor Bridge Sub-API
  python: {
    startVideoProcessing: (config) => {
      if (config && typeof config === 'object') {
        return ipcRenderer.invoke('python:start-video-processing', config);
      }
      return Promise.reject(new Error('Invalid task configuration'));
    },
    cancelVideoProcessing: (taskId) => {
      if (typeof taskId === 'string') {
        return ipcRenderer.invoke('python:cancel-video-processing', { taskId });
      }
      return Promise.reject(new Error('Invalid taskId parameter'));
    },
    getActiveTasks: () => ipcRenderer.invoke('python:get-active-tasks'),
    onProgress: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:progress', handler);
      return () => ipcRenderer.removeListener('python:progress', handler);
    },
    onLog: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:log', handler);
      return () => ipcRenderer.removeListener('python:log', handler);
    },
    onCompleted: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:completed', handler);
      return () => ipcRenderer.removeListener('python:completed', handler);
    },
    onError: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:error', handler);
      return () => ipcRenderer.removeListener('python:error', handler);
    },
    onCancelled: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:cancelled', handler);
      return () => ipcRenderer.removeListener('python:cancelled', handler);
    }
  }
});
