const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openJavaFile: () => ipcRenderer.invoke('files:open-java'),
  saveJavaFile: (payload) => ipcRenderer.invoke('files:save-java', payload),
});
