const { contextBridge, ipcRenderer } = require('electron');

console.log("---- Preload Script Loading ----");

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ['save-customers', 'save-settings', 'load-data', 'set-settings-path-and-reload', 'set-customers-path-and-reload'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  invoke: (channel, data) => {
    console.log(`Preload: Invoking IPC channel '${channel}'`);
    let validChannels = ['show-open-dialog', 'save-customers'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },
  on: (channel, func) => {
    let validChannels = ['data-loaded'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
