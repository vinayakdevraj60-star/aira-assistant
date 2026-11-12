const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('aira:get-config'),
  saveConfig: (config) => ipcRenderer.invoke('aira:save-config', config),
  
  // Gemini AI Query
  askAira: (payload) => ipcRenderer.invoke('aira:ask', payload),
  testApiKey: (apiKey) => ipcRenderer.invoke('aira:test-api-key', apiKey),
  
  // Voice & TTS
  synthesizeSpeech: (payload) => ipcRenderer.invoke('aira:synthesize-speech', payload),
  getVoiceTextures: () => ipcRenderer.invoke('aira:get-voice-textures'),
  testVoice: (payload) => ipcRenderer.invoke('aira:test-voice', payload),
  transcribeAudio: (base64Wav) => ipcRenderer.invoke('aira:transcribe-audio', base64Wav),

  // Screen & Window Vision
  captureScreen: (displayIndex, options) => ipcRenderer.invoke('aira:capture-screen', displayIndex, options),
  getDisplays: () => ipcRenderer.invoke('aira:get-displays'),
  getWindows: () => ipcRenderer.invoke('aira:get-windows'),
  captureWindow: (windowId, options) => ipcRenderer.invoke('aira:capture-window', windowId, options),

  // History & Logs
  getHistory: () => ipcRenderer.invoke('aira:get-history'),
  clearHistory: () => ipcRenderer.invoke('aira:clear-history'),

  // Connected Devices & Telemetry
  getDevices: () => ipcRenderer.invoke('aira:get-devices'),
  clearDevicesCache: () => ipcRenderer.invoke('aira:clear-devices-cache'),
  deleteDevice: (deviceId) => ipcRenderer.invoke('aira:delete-device', deviceId),
  getBlockedDevices: () => ipcRenderer.invoke('aira:get-blocked-devices'),
  unblockDevice: (deviceId) => ipcRenderer.invoke('aira:unblock-device', deviceId),
  pingDevice: () => ipcRenderer.invoke('aira:ping-device'),

  // Study Packs & Revision
  getStudyPacks: () => ipcRenderer.invoke('aira:get-study-packs'),
  getLatestStudyPack: () => ipcRenderer.invoke('aira:get-latest-study-pack'),
  saveStudyPack: (pack) => ipcRenderer.invoke('aira:save-study-pack', pack),
  deleteStudyPack: (id) => ipcRenderer.invoke('aira:delete-study-pack', id),
  clearStudyPacks: () => ipcRenderer.invoke('aira:clear-study-packs'),

  // Document & Presentation Generation
  generatePresentation: (payload) => ipcRenderer.invoke('aira:generate-presentation', payload),
  generateReport: (payload) => ipcRenderer.invoke('aira:generate-report', payload),
  openFile: (filePath) => ipcRenderer.invoke('aira:open-file', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('aira:show-in-folder', filePath),

  // Window Management
  showBall: () => ipcRenderer.invoke('aira:show-ball'),
  hideBall: () => ipcRenderer.invoke('aira:hide-ball'),
  closeCompletely: () => ipcRenderer.invoke('aira:close-completely'),
  openAdmin: () => ipcRenderer.invoke('aira:open-admin'),
  setBallSize: (dimensions) => ipcRenderer.invoke('aira:set-ball-size', dimensions),
  moveBallWindow: (deltaX, deltaY) => ipcRenderer.send('aira:move-ball-window', { deltaX, deltaY }),

  // Event Listeners from Main Process
  onWakeCommand: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('aira:wake-triggered', handler);
    return () => ipcRenderer.removeListener('aira:wake-triggered', handler);
  },
  onSleepCommand: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('aira:sleep-triggered', handler);
    return () => ipcRenderer.removeListener('aira:sleep-triggered', handler);
  },
  onConfigUpdated: (callback) => {
    const handler = (_, newConfig) => callback(newConfig);
    ipcRenderer.on('aira:config-updated', handler);
    return () => ipcRenderer.removeListener('aira:config-updated', handler);
  }
});
