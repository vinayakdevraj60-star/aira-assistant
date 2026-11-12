const { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, nativeImage, session, shell } = require('electron');
const path = require('path');
const storage = require('./src/services/storage');
const geminiService = require('./src/services/gemini');
const ttsService = require('./src/services/tts');
const sttService = require('./src/services/stt');
const screenService = require('./src/services/screen');
const documentService = require('./src/services/documentService');
const deviceTracker = require('./src/services/deviceTracker');

let dockWindow = null;
let ballWindow = null;
let adminWindow = null;
let tray = null;

// Create small default icon in memory
function createTrayIcon() {
  // 16x16 cyan circle
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - 8;
      const dy = y - 8;
      if (dx * dx + dy * dy <= 36) {
        canvas[idx] = 0;       // B
        canvas[idx + 1] = 210; // G
        canvas[idx + 2] = 255; // R
        canvas[idx + 3] = 255; // A
      } else {
        canvas[idx + 3] = 0;   // Transparent
      }
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function createDockWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  dockWindow = new BrowserWindow({
    width: 65,
    height: 160,
    x: width - 65,
    y: Math.floor(height * 0.45),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  dockWindow.loadFile(path.join(__dirname, 'src', 'dock', 'dock.html'));
  dockWindow.setAlwaysOnTop(true, process.platform === 'darwin' ? 'floating' : 'screen-saver');

  dockWindow.on('closed', () => {
    dockWindow = null;
  });
}

function createBallWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const winWidth = 470;
  const winHeight = 675;

  ballWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 25,
    y: Math.max(20, Math.floor((height - winHeight) / 2)),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    hasShadow: false,
    show: false, // Initially hidden until popped out
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ballWindow.loadFile(path.join(__dirname, 'src', 'ball', 'index.html'));
  ballWindow.setAlwaysOnTop(true, process.platform === 'darwin' ? 'floating' : 'screen-saver');

  ballWindow.on('closed', () => {
    ballWindow = null;
  });
}

function createAdminWindow() {
  if (adminWindow) {
    adminWindow.focus();
    return;
  }

  adminWindow = new BrowserWindow({
    width: 960,
    height: 740,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    title: 'AIRA AI - Master Admin Console',
    backgroundColor: '#0a0e17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  adminWindow.loadFile(path.join(__dirname, 'src', 'admin', 'admin.html'));

  adminWindow.on('closed', () => {
    adminWindow = null;
  });
}

function showBall() {
  if (!ballWindow) {
    createBallWindow();
  }
  ballWindow.show();
  ballWindow.focus();
  if (dockWindow) {
    dockWindow.webContents.send('dock:state-changed', { expanded: true });
  }
  if (ballWindow) {
    ballWindow.webContents.send('aira:wake-triggered');
  }
}

function hideBall() {
  if (ballWindow) {
    ballWindow.hide();
  }
  if (dockWindow) {
    dockWindow.show();
    dockWindow.webContents.send('dock:state-changed', { expanded: false });
  }
}

function setupTray() {
  try {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('AIRA - 3D Vision & Voice Assistant');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Wake AIRA (3D Ball)', click: () => showBall() },
      { label: 'Dock / Hide Ball', click: () => hideBall() },
      { type: 'separator' },
      { label: 'Open Admin Console (Private)', click: () => createAdminWindow() },
      { type: 'separator' },
      { label: 'Exit Completely', click: () => app.quit() }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (ballWindow && ballWindow.isVisible()) {
        hideBall();
      } else {
        showBall();
      }
    });
  } catch (e) {
    console.error('[Main] Tray creation error:', e);
  }
}

function registerShortcuts() {
  const config = storage.getConfig();
  const toggleKey = config.hotkeys?.toggleBall || 'CommandOrControl+Alt+A';
  const adminKey = config.hotkeys?.openAdmin || 'CommandOrControl+Shift+A';

  try {
    globalShortcut.register(toggleKey, () => {
      if (ballWindow && ballWindow.isVisible()) {
        hideBall();
      } else {
        showBall();
      }
    });

    globalShortcut.register(adminKey, () => {
      createAdminWindow();
    });
  } catch (e) {
    console.error('[Main] Shortcut registration error:', e);
  }
}

// App lifecycle
app.whenReady().then(() => {
  createDockWindow();
  createBallWindow();
  showBall();
  setupTray();
  registerShortcuts();
  deviceTracker.start();

  // Explicitly allow microphone permissions in Electron
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      return callback(true);
    }
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return true;
  });
  session.defaultSession.setDevicePermissionHandler(() => true);

  // Handle IPC calls
  ipcMain.handle('aira:transcribe-audio', async (_, base64Wav) => {
    return await sttService.transcribeWav(base64Wav);
  });
  ipcMain.handle('aira:get-config', () => storage.getConfig());
  ipcMain.handle('aira:save-config', (_, newConfig) => {
    const res = storage.saveConfig(newConfig);
    // Broadcast config update to all windows
    if (ballWindow) ballWindow.webContents.send('aira:config-updated', storage.getConfig());
    if (adminWindow) adminWindow.webContents.send('aira:config-updated', storage.getConfig());
    return res;
  });

  ipcMain.handle('aira:get-history', () => storage.getHistory());
  ipcMain.handle('aira:clear-history', () => storage.clearHistory());

  // Device Telemetry & Connected Devices IPC
  ipcMain.handle('aira:get-devices', async () => {
    return await deviceTracker.getDevices();
  });
  ipcMain.handle('aira:clear-devices-cache', async () => {
    return await deviceTracker.clearDevicesCache();
  });
  ipcMain.handle('aira:delete-device', async (_, deviceId) => {
    return await deviceTracker.deleteDevice(deviceId);
  });
  ipcMain.handle('aira:get-blocked-devices', () => {
    return deviceTracker.getBlockedDevices();
  });
  ipcMain.handle('aira:unblock-device', async (_, deviceId) => {
    return await deviceTracker.unblockDevice(deviceId);
  });
  ipcMain.handle('aira:ping-device', async () => {
    return await deviceTracker.sendHeartbeat('online');
  });

  // Study Packs & Revision IPC
  ipcMain.handle('aira:get-study-packs', () => storage.getStudyPacks());
  ipcMain.handle('aira:get-latest-study-pack', () => storage.getLatestStudyPack());
  ipcMain.handle('aira:save-study-pack', (_, pack) => storage.saveStudyPack(pack));
  ipcMain.handle('aira:delete-study-pack', (_, id) => storage.deleteStudyPack(id));
  ipcMain.handle('aira:clear-study-packs', () => storage.clearStudyPacks());

  ipcMain.handle('aira:ask', async (_, payload) => {
    return await geminiService.askAira(payload);
  });

  ipcMain.handle('aira:test-api-key', async (_, key) => {
    return await geminiService.testConnection(key);
  });

  ipcMain.handle('aira:synthesize-speech', async (_, { text, voiceConfig }) => {
    const config = voiceConfig || storage.getConfig().voice;
    return await ttsService.synthesize(text, config);
  });

  ipcMain.handle('aira:test-voice', async (_, voiceConfig) => {
    const sample = "Greetings! I am Aira, your personal 3D vision and voice assistant.";
    return await ttsService.synthesize(sample, voiceConfig);
  });

  ipcMain.handle('aira:get-voice-textures', () => {
    return ttsService.getVoiceTextures();
  });

  ipcMain.handle('aira:capture-screen', async (_, displayIndex, options) => {
    return await screenService.captureScreen(displayIndex || 0, options || {});
  });

  ipcMain.handle('aira:get-displays', async () => {
    return await screenService.getDisplays();
  });

  ipcMain.handle('aira:get-windows', async () => {
    return await screenService.getWindows();
  });

  ipcMain.handle('aira:capture-window', async (_, windowId, options) => {
    return await screenService.captureWindow(windowId, options || {});
  });

  ipcMain.handle('aira:show-ball', () => {
    showBall();
    return true;
  });

  ipcMain.handle('aira:hide-ball', () => {
    hideBall();
    return true;
  });

  ipcMain.handle('aira:set-ball-size', (_, { width, height }) => {
    if (ballWindow) {
      const bounds = ballWindow.getBounds();
      const newW = width || bounds.width;
      const newH = height || bounds.height;
      // Keep right-aligned or anchored
      const deltaW = newW - bounds.width;
      const deltaH = newH - bounds.height;
      ballWindow.setBounds({
        x: Math.max(10, bounds.x - deltaW),
        y: Math.max(10, bounds.y - Math.floor(deltaH / 2)),
        width: newW,
        height: newH
      });
      return true;
    }
    return false;
  });

  ipcMain.handle('aira:close-completely', () => {
    console.log('[Main] Closing application completely as requested...');
    try {
      globalShortcut.unregisterAll();
      if (tray) {
        tray.destroy();
        tray = null;
      }
      BrowserWindow.getAllWindows().forEach(w => {
        try { w.destroy(); } catch (e) {}
      });
    } catch (e) {
      console.error('[Main] Teardown error on close:', e);
    }
    app.exit(0);
    return true;
  });

  ipcMain.handle('aira:open-admin', () => {
    createAdminWindow();
    return true;
  });

  // Document & Presentation Generation IPC Handlers
  ipcMain.handle('aira:generate-presentation', async (_, payload) => {
    try {
      const content = await documentService.generatePresentationContent(payload);
      const res = await documentService.createPptxFile(content, payload.topic);
      return res;
    } catch (err) {
      console.error('[Main] Error generating presentation:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('aira:generate-report', async (_, { format = 'pdf', topic, context, screenCapture, images }) => {
    try {
      const content = await documentService.generateReportContent({ topic, context, screenCapture, images });

      if (format === 'both') {
        const [pdfRes, docxRes] = await Promise.all([
          documentService.createPdfFile(content, topic, BrowserWindow),
          documentService.createDocxFile(content, topic)
        ]);
        return {
          success: true,
          format: 'both',
          files: [pdfRes, docxRes],
          title: content.title
        };
      } else if (format === 'docx' || format === 'word') {
        return await documentService.createDocxFile(content, topic);
      } else {
        return await documentService.createPdfFile(content, topic, BrowserWindow);
      }
    } catch (err) {
      console.error('[Main] Error generating report:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('aira:open-file', async (_, filePath) => {
    if (!filePath) return false;
    try {
      await shell.openPath(filePath);
      return true;
    } catch (e) {
      console.error('[Main] Error opening file:', e);
      return false;
    }
  });

  ipcMain.handle('aira:show-in-folder', async (_, filePath) => {
    if (!filePath) return false;
    try {
      shell.showItemInFolder(filePath);
      return true;
    } catch (e) {
      console.error('[Main] Error showing file in folder:', e);
      return false;
    }
  });

  ipcMain.on('aira:move-ball-window', (_, { deltaX, deltaY }) => {
    if (ballWindow) {
      const [curX, curY] = ballWindow.getPosition();
      ballWindow.setPosition(curX + deltaX, curY + deltaY);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDockWindow();
      createBallWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});

app.on('will-quit', () => {
  deviceTracker.stop();
  globalShortcut.unregisterAll();
});
