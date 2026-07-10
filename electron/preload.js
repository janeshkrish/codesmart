const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // We can add specific electron-to-react communications here if needed.
  // For now, most communication will be over WebSocket to the Java backend.
});
