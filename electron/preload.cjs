const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  windowControl: (action) => {
    ipcRenderer.send('window-control', action);
  },
  restartDaemon: () => {
    return ipcRenderer.invoke('restart-daemon');
  },
  openFile: (filePath) => {
    return ipcRenderer.invoke('open-file', filePath);
  },
  executeElevated: (command) => {
    return ipcRenderer.invoke('execute-elevated', command);
  },
  checkIsElevated: () => {
    return ipcRenderer.invoke('check-is-elevated');
  },
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,

  // Python Video Processor Bridge
  python: {
    startVideoProcessing: (config) => {
      return ipcRenderer.invoke('python:start-video-processing', config);
    },
    cancelVideoProcessing: (taskId) => {
      return ipcRenderer.invoke('python:cancel-video-processing', { taskId });
    },
    getActiveTasks: () => {
      return ipcRenderer.invoke('python:get-active-tasks');
    },
    onProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:progress', handler);
      return () => ipcRenderer.removeListener('python:progress', handler);
    },
    onLog: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:log', handler);
      return () => ipcRenderer.removeListener('python:log', handler);
    },
    onCompleted: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:completed', handler);
      return () => ipcRenderer.removeListener('python:completed', handler);
    },
    onError: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:error', handler);
      return () => ipcRenderer.removeListener('python:error', handler);
    },
    onCancelled: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('python:cancelled', handler);
      return () => ipcRenderer.removeListener('python:cancelled', handler);
    }
  }
});
