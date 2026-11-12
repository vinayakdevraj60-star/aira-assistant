// Elements
const authOverlay = document.getElementById('authOverlay');
const pinInput = document.getElementById('pinInput');
const btnUnlockPin = document.getElementById('btnUnlockPin');
const authError = document.getElementById('authError');
const dashboardContainer = document.getElementById('dashboardContainer');
const btnLockAdmin = document.getElementById('btnLockAdmin');

// Form Elements
const cfgApiKey = document.getElementById('cfgApiKey');
const btnToggleKey = document.getElementById('btnToggleKey');
const btnTestKey = document.getElementById('btnTestKey');
const keyTestResult = document.getElementById('keyTestResult');
const cfgModel = document.getElementById('cfgModel');
const cfgSearch = document.getElementById('cfgSearch');
const cfgSystemPrompt = document.getElementById('cfgSystemPrompt');
const btnSaveAI = document.getElementById('btnSaveAI');

// Voice
const cfgPitch = document.getElementById('cfgPitch');
const pitchVal = document.getElementById('pitchVal');
const cfgRate = document.getElementById('cfgRate');
const rateVal = document.getElementById('rateVal');
const btnTestVoice = document.getElementById('btnTestVoice');
const btnSaveVoice = document.getElementById('btnSaveVoice');
const voiceTestStatus = document.getElementById('voiceTestStatus');
const adminAudioTester = document.getElementById('adminAudioTester');

// Microphone & Earbuds
const cfgAudioInput = document.getElementById('cfgAudioInput');
const cfgSensitivity = document.getElementById('cfgSensitivity');
const sensitivityVal = document.getElementById('sensitivityVal');
const btnTestMicInput = document.getElementById('btnTestMicInput');
const micTestStatus = document.getElementById('micTestStatus');
const micMeterBar = document.getElementById('micMeterBar');
const cfgHandsFree = document.getElementById('cfgHandsFree');
const btnSaveMic = document.getElementById('btnSaveMic');
let adminTestRecorder = null;
let isAdminTestingMic = false;

// Screen Vision
const cfgDisplaySelect = document.getElementById('cfgDisplaySelect');
const cfgLiveVision = document.getElementById('cfgLiveVision');
const btnTestScreenCapture = document.getElementById('btnTestScreenCapture');
const btnSaveVision = document.getElementById('btnSaveVision');
const screenPreviewBox = document.getElementById('screenPreviewBox');
const screenPreviewImg = document.getElementById('screenPreviewImg');

// Wake & Sleep
const cfgWakeWords = document.getElementById('cfgWakeWords');
const cfgSleepWords = document.getElementById('cfgSleepWords');
const btnSaveWake = document.getElementById('btnSaveWake');

// Security & History
const cfgCurrentPin = document.getElementById('cfgCurrentPin');
const btnToggleCurrentPin = document.getElementById('btnToggleCurrentPin');
const cfgNewPin = document.getElementById('cfgNewPin');
const btnToggleNewPin = document.getElementById('btnToggleNewPin');
const cfgConfirmPin = document.getElementById('cfgConfirmPin');
const btnToggleConfirmPin = document.getElementById('btnToggleConfirmPin');
const btnSavePin = document.getElementById('btnSavePin');
const pinChangeStatus = document.getElementById('pinChangeStatus');
const historyList = document.getElementById('historyList');
const btnClearHistory = document.getElementById('btnClearHistory');

let currentConfig = null;

// --- PIN Authentication ---
async function checkPin() {
  const entered = pinInput.value.trim();
  const config = await window.electronAPI.getConfig();
  const validPin = config.adminPin || '1234';

  if (entered === validPin) {
    authOverlay.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    authError.textContent = '';
    pinInput.value = '';
    loadAllData();
  } else {
    authError.textContent = 'Invalid Master PIN. Please try again.';
    pinInput.select();
  }
}

const btnToggleAuthPin = document.getElementById('btnToggleAuthPin');
if (btnToggleAuthPin && pinInput) {
  btnToggleAuthPin.addEventListener('click', (e) => {
    e.preventDefault();
    if (pinInput.type === 'password') {
      pinInput.type = 'text';
      btnToggleAuthPin.textContent = 'Hide';
    } else {
      pinInput.type = 'password';
      btnToggleAuthPin.textContent = 'Show';
    }
    pinInput.focus();
  });
}

btnUnlockPin.addEventListener('click', checkPin);
pinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkPin();
});

btnLockAdmin.addEventListener('click', () => {
  dashboardContainer.style.display = 'none';
  authOverlay.style.display = 'flex';
  pinInput.value = '';
});

// --- Tab Navigation ---
document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));

    button.classList.add('active');
    const targetId = button.getAttribute('data-tab');
    document.getElementById(targetId).classList.add('active');

    if (targetId === 'tab-history') {
      loadHistory();
    }
    if (targetId === 'tab-devices') {
      loadDevices();
      startDevicesAutoRefresh();
    } else {
      stopDevicesAutoRefresh();
    }
  });
});

// --- Load Config & Populate ---
async function loadAllData() {
  currentConfig = await window.electronAPI.getConfig();

  // Populate AI Tab
  cfgApiKey.value = currentConfig.geminiApiKey || '';
  cfgModel.value = currentConfig.modelName || 'gemini-3.5-flash-lite';
  cfgSearch.checked = currentConfig.enableSearch !== false;
  cfgSystemPrompt.value = currentConfig.systemPrompt || '';

  // Pitch & Rate
  const pitch = parseInt(currentConfig.voice?.pitch || '0', 10);
  cfgPitch.value = isNaN(pitch) ? 0 : pitch;
  pitchVal.textContent = (pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`);

  const rate = parseInt(currentConfig.voice?.rate || '0', 10);
  cfgRate.value = isNaN(rate) ? 0 : rate;
  rateVal.textContent = (rate >= 0 ? `+${rate}%` : `${rate}%`);

  // Populate Microphones & Earbuds
  try {
    if (window.AudioRecorder) {
      const mics = await window.AudioRecorder.getAudioInputDevices();
      cfgAudioInput.innerHTML = '';
      const autoOpt = document.createElement('option');
      autoOpt.value = 'auto';
      autoOpt.textContent = '⚡ Auto-Detect Earbuds / Best Microphone';
      cfgAudioInput.appendChild(autoOpt);

      mics.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.deviceId;
        opt.textContent = m.isEarbuds ? `🎧 ${m.label} [Earbuds/Headset]` : `🎙️ ${m.label}`;
        cfgAudioInput.appendChild(opt);
      });

      cfgAudioInput.value = currentConfig.audioInputDeviceId || 'auto';
    }
  } catch (e) {
    console.warn('[Admin] Error loading audio input devices:', e);
  }

  // Microphone sensitivity
  const sens = parseFloat(currentConfig.micSensitivity || 1.6);
  cfgSensitivity.value = Math.round(sens * 10);
  sensitivityVal.textContent = sens.toFixed(1) + 'x';

  // Displays
  try {
    const displays = await window.electronAPI.getDisplays();
    cfgDisplaySelect.innerHTML = '';
    displays.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.index;
      opt.textContent = `${d.label} ${d.isPrimary ? '[Primary]' : ''}`;
      cfgDisplaySelect.appendChild(opt);
    });
  } catch (e) {}

  // Hands-Free Mode & Live Vision
  if (cfgHandsFree) {
    cfgHandsFree.checked = currentConfig.handsFreeMode !== false;
  }
  if (cfgLiveVision) {
    cfgLiveVision.checked = currentConfig.liveScreenVision !== false;
  }

  // Wake & Sleep words
  cfgWakeWords.value = (currentConfig.wakeWords || []).join(', ');
  cfgSleepWords.value = (currentConfig.sleepWords || []).join(', ');
}

// Sliders live text
cfgPitch.addEventListener('input', () => {
  const v = cfgPitch.value;
  pitchVal.textContent = (v >= 0 ? `+${v}Hz` : `${v}Hz`);
});

cfgRate.addEventListener('input', () => {
  const v = cfgRate.value;
  rateVal.textContent = (v >= 0 ? `+${v}%` : `${v}%`);
});

// Password Toggle
btnToggleKey.addEventListener('click', () => {
  if (cfgApiKey.type === 'password') {
    cfgApiKey.type = 'text';
    btnToggleKey.textContent = 'Hide';
  } else {
    cfgApiKey.type = 'password';
    btnToggleKey.textContent = 'Show';
  }
});

// Test API Key
btnTestKey.addEventListener('click', async () => {
  keyTestResult.textContent = 'Testing connection with Google Gemini...';
  keyTestResult.className = 'test-result';
  const key = cfgApiKey.value.trim();
  const res = await window.electronAPI.testApiKey(key);
  if (res.success) {
    keyTestResult.textContent = '✓ ' + res.message;
    keyTestResult.className = 'test-result success';
  } else {
    keyTestResult.textContent = '✗ ' + res.error;
    keyTestResult.className = 'test-result error';
  }
});

// Save AI Settings
btnSaveAI.addEventListener('click', async () => {
  await window.electronAPI.saveConfig({
    geminiApiKey: cfgApiKey.value.trim(),
    modelName: cfgModel.value,
    enableSearch: cfgSearch.checked,
    systemPrompt: cfgSystemPrompt.value.trim()
  });
  alert('AI settings saved successfully!');
});

// Test Voice
btnTestVoice.addEventListener('click', async () => {
  voiceTestStatus.textContent = 'Synthesizing voice sample...';
  voiceTestStatus.className = 'test-result';

  const v = cfgPitch.value;
  const r = cfgRate.value;
  const voiceConfig = {
    voiceName: currentConfig.voice?.voiceName || 'en-US-AriaNeural',
    pitch: (v >= 0 ? `+${v}Hz` : `${v}Hz`),
    rate: (r >= 0 ? `+${r}%` : `${r}%`),
    volume: '+0%'
  };

  const res = await window.electronAPI.testVoice(voiceConfig);
  if (res && res.success) {
    voiceTestStatus.textContent = `✓ Playing voice sample (${res.voice})`;
    voiceTestStatus.className = 'test-result success';
    adminAudioTester.src = res.audioDataUrl;
    adminAudioTester.play();
  } else {
    voiceTestStatus.textContent = `✗ Voice synthesis failed: ${res.error}`;
    voiceTestStatus.className = 'test-result error';
  }
});

// Save Voice Settings
btnSaveVoice.addEventListener('click', async () => {
  const v = cfgPitch.value;
  const r = cfgRate.value;
  const existingVoice = currentConfig.voice || {};
  await window.electronAPI.saveConfig({
    voice: {
      ...existingVoice,
      provider: 'edge-tts',
      pitch: (v >= 0 ? `+${v}Hz` : `${v}Hz`),
      rate: (r >= 0 ? `+${r}%` : `${r}%`),
      volume: '+0%'
    }
  });
  alert('Voice settings saved successfully!');
});

// Sensitivity slider
cfgSensitivity.addEventListener('input', () => {
  const val = (cfgSensitivity.value / 10).toFixed(1);
  sensitivityVal.textContent = `${val}x`;
});

// Live Mic Input Tester
btnTestMicInput.addEventListener('click', async () => {
  if (!isAdminTestingMic) {
    isAdminTestingMic = true;
    btnTestMicInput.textContent = '⏹️ Stop Mic Test';
    btnTestMicInput.className = 'btn-danger';
    micTestStatus.textContent = 'Listening... Speak into your earbuds now.';
    micTestStatus.style.color = '#38bdf8';

    try {
      if (!adminTestRecorder) {
        adminTestRecorder = new window.AudioRecorder();
      }
      const sens = parseFloat(cfgSensitivity.value) / 10;
      adminTestRecorder.setSensitivity(sens);

      adminTestRecorder.onVolume((vol) => {
        if (!isAdminTestingMic) return;
        const pct = Math.min(100, Math.round(vol * 100));
        micMeterBar.style.width = `${pct}%`;
        if (vol > 0.03) {
          micTestStatus.textContent = `🟢 Voice detected! (Level: ${pct}%)`;
          micTestStatus.style.color = '#34d399';
        } else {
          micTestStatus.textContent = 'Listening... Speak into your earbuds';
          micTestStatus.style.color = '#94a3b8';
        }
      });

      const selectedDev = cfgAudioInput.value;
      await adminTestRecorder.start(selectedDev);
    } catch (err) {
      console.error('Admin mic test error:', err);
      micTestStatus.textContent = `Mic error: ${err.message}`;
      micTestStatus.style.color = '#ef4444';
      isAdminTestingMic = false;
      btnTestMicInput.textContent = '🎙️ Start Mic Test';
      btnTestMicInput.className = 'btn-secondary';
    }
  } else {
    isAdminTestingMic = false;
    btnTestMicInput.textContent = '🎙️ Start Mic Test';
    btnTestMicInput.className = 'btn-secondary';
    micTestStatus.textContent = 'Mic test ended.';
    micTestStatus.style.color = '#94a3b8';
    micMeterBar.style.width = '0%';
    if (adminTestRecorder) {
      await adminTestRecorder.stop();
    }
  }
});

// Save Microphone Settings
btnSaveMic.addEventListener('click', async () => {
  const sens = parseFloat(cfgSensitivity.value) / 10;
  await window.electronAPI.saveConfig({
    audioInputDeviceId: cfgAudioInput.value,
    micSensitivity: sens,
    handsFreeMode: cfgHandsFree ? cfgHandsFree.checked : true
  });
  alert('Microphone settings saved successfully!');
});

// Test Screen Capture
btnTestScreenCapture.addEventListener('click', async () => {
  try {
    const dispIdx = parseInt(cfgDisplaySelect.value, 10) || 0;
    const dataUrl = await window.electronAPI.captureScreen(dispIdx);
    screenPreviewImg.src = dataUrl;
    screenPreviewBox.style.display = 'block';
  } catch (e) {
    alert('Screen capture failed: ' + e.message);
  }
});

// Save Screen Vision Settings
if (btnSaveVision) {
  btnSaveVision.addEventListener('click', async () => {
    await window.electronAPI.saveConfig({
      liveScreenVision: cfgLiveVision ? cfgLiveVision.checked : true
    });
    alert('Screen vision settings saved successfully!');
  });
}

// Save Wake & Sleep Words
btnSaveWake.addEventListener('click', async () => {
  const wakeList = cfgWakeWords.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const sleepList = cfgSleepWords.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  await window.electronAPI.saveConfig({
    wakeWords: wakeList,
    sleepWords: sleepList
  });
  alert('Wake & sleep triggers saved successfully!');
});

// Toggle PIN visibility helper
function setupPinVisibilityToggle(btn, inputElem) {
  if (!btn || !inputElem) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (inputElem.type === 'password') {
      inputElem.type = 'text';
      btn.textContent = 'Hide';
    } else {
      inputElem.type = 'password';
      btn.textContent = 'Show';
    }
    inputElem.focus();
  });
}

setupPinVisibilityToggle(btnToggleCurrentPin, cfgCurrentPin);
setupPinVisibilityToggle(btnToggleNewPin, cfgNewPin);
setupPinVisibilityToggle(btnToggleConfirmPin, cfgConfirmPin);

// Change Admin PIN
btnSavePin.addEventListener('click', async () => {
  const currentPinInput = (cfgCurrentPin ? cfgCurrentPin.value : '').trim();
  const newPin = (cfgNewPin ? cfgNewPin.value : '').trim();
  const confirmPin = (cfgConfirmPin ? cfgConfirmPin.value : '').trim();

  // 1. Verify Current PIN
  const config = await window.electronAPI.getConfig();
  const activeMasterPin = config.adminPin || '1234';

  if (!currentPinInput) {
    pinChangeStatus.textContent = 'Please enter your current Master PIN.';
    pinChangeStatus.className = 'test-result error';
    if (cfgCurrentPin) cfgCurrentPin.focus();
    return;
  }

  if (currentPinInput !== activeMasterPin) {
    pinChangeStatus.textContent = 'Incorrect current Master PIN. Verify and try again.';
    pinChangeStatus.className = 'test-result error';
    if (cfgCurrentPin) {
      cfgCurrentPin.focus();
      cfgCurrentPin.select();
    }
    return;
  }

  // 2. Validate New PIN format
  if (newPin.length < 4 || newPin.length > 8) {
    pinChangeStatus.textContent = 'New PIN must be between 4 and 8 characters/digits.';
    pinChangeStatus.className = 'test-result error';
    if (cfgNewPin) cfgNewPin.focus();
    return;
  }

  // 3. Confirm PIN match
  if (newPin !== confirmPin) {
    pinChangeStatus.textContent = 'New PIN and Confirmation PIN do not match.';
    pinChangeStatus.className = 'test-result error';
    if (cfgConfirmPin) {
      cfgConfirmPin.focus();
      cfgConfirmPin.select();
    }
    return;
  }

  // 4. Save New PIN
  await window.electronAPI.saveConfig({ adminPin: newPin });
  pinChangeStatus.textContent = '✓ Master PIN successfully updated! Use your new PIN next time you log in.';
  pinChangeStatus.className = 'test-result success';

  // Clear input fields
  if (cfgCurrentPin) cfgCurrentPin.value = '';
  if (cfgNewPin) cfgNewPin.value = '';
  if (cfgConfirmPin) cfgConfirmPin.value = '';
});

// History & Logs
async function loadHistory() {
  historyList.innerHTML = '<div style="color:#64748b;">Loading logs...</div>';
  const history = await window.electronAPI.getHistory();

  if (!history || history.length === 0) {
    historyList.innerHTML = '<div style="color:#64748b; padding:20px 0;">No conversation logs recorded yet.</div>';
    return;
  }

  historyList.innerHTML = '';
  history.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const badges = [];
    if (item.hasScreen) badges.push('<span class="badge screen">🖥️ Screen</span>');
    if (item.imagesCount > 0) badges.push(`<span class="badge">🖼️ ${item.imagesCount} Image(s)</span>`);
    if (item.sources && item.sources.length > 0) badges.push(`<span class="badge search">🔍 Grounded (${item.sources.length} sources)</span>`);

    card.innerHTML = `
      <div class="history-time">${new Date(item.timestamp).toLocaleString()}</div>
      <div class="history-q">Q: ${item.prompt || 'Vision Query'}</div>
      <div class="history-a">Aira: ${item.response || ''}</div>
      <div class="history-badges">${badges.join(' ')}</div>
    `;
    historyList.appendChild(card);
  });
}

btnClearHistory.addEventListener('click', async () => {
  if (confirm('Are you sure you want to delete all conversation history?')) {
    await window.electronAPI.clearHistory();
    loadHistory();
  }
});

// --- Connected Devices & Multi-Device Telemetry ---
const statTotalDevices = document.getElementById('statTotalDevices');
const statActiveDevices = document.getElementById('statActiveDevices');
const statWindowsDevices = document.getElementById('statWindowsDevices');
const statMacDevices = document.getElementById('statMacDevices');
const deviceSearchInput = document.getElementById('deviceSearchInput');
const deviceListRows = document.getElementById('deviceListRows');
const btnRefreshDevices = document.getElementById('btnRefreshDevices');
const refreshIcon = document.getElementById('refreshIcon');
const btnClearDevicesCache = document.getElementById('btnClearDevicesCache');
const btnToggleBlockedPanel = document.getElementById('btnToggleBlockedPanel');
const blockedDevicesCount = document.getElementById('blockedDevicesCount');
const blockedDevicesPanel = document.getElementById('blockedDevicesPanel');
const btnCloseBlockedPanel = document.getElementById('btnCloseBlockedPanel');
const blockedDevicesList = document.getElementById('blockedDevicesList');

let cachedDeviceData = [];
let cachedBlockedData = [];
let devicesRefreshTimer = null;
let isRefreshingDevices = false;

function startDevicesAutoRefresh() {
  stopDevicesAutoRefresh();
  devicesRefreshTimer = setInterval(() => {
    loadDevices(true);
  }, 20000); // 20s live polling
}

function stopDevicesAutoRefresh() {
  if (devicesRefreshTimer) {
    clearInterval(devicesRefreshTimer);
    devicesRefreshTimer = null;
  }
}

async function loadDevices(isSilent = false) {
  if (isRefreshingDevices) return;
  isRefreshingDevices = true;

  if (!isSilent && refreshIcon) {
    refreshIcon.classList.add('spinning');
  }

  try {
    const res = await window.electronAPI.getDevices();
    if (res && res.success) {
      if (statTotalDevices) statTotalDevices.textContent = res.stats.totalDevices;
      if (statActiveDevices) statActiveDevices.textContent = res.stats.activeDevices;
      if (statWindowsDevices) statWindowsDevices.textContent = res.stats.windowsDevices;
      if (statMacDevices) statMacDevices.textContent = res.stats.macDevices;
      if (blockedDevicesCount) blockedDevicesCount.textContent = res.blockedCount || (res.blockedDevices ? res.blockedDevices.length : 0);

      cachedDeviceData = res.devices || [];
      cachedBlockedData = res.blockedDevices || [];
      renderDevicesTable(cachedDeviceData);
      if (blockedDevicesPanel && blockedDevicesPanel.style.display !== 'none') {
        renderBlockedTable(cachedBlockedData);
      }
    }
  } catch (err) {
    console.error('[Admin] Error loading devices:', err);
    if (!isSilent && deviceListRows) {
      deviceListRows.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #f43f5e; font-size: 13px;">
          Failed to fetch devices: ${err.message || 'Network error'}
        </div>
      `;
    }
  } finally {
    isRefreshingDevices = false;
    if (refreshIcon) {
      setTimeout(() => refreshIcon.classList.remove('spinning'), 500);
    }
  }
}

function renderDevicesTable(devices) {
  if (!deviceListRows) return;

  const query = (deviceSearchInput ? deviceSearchInput.value.trim().toLowerCase() : '');
  const filtered = devices.filter(d => {
    if (!query) return true;
    return (
      (d.deviceName && d.deviceName.toLowerCase().includes(query)) ||
      (d.deviceId && d.deviceId.toLowerCase().includes(query)) ||
      (d.os && d.os.toLowerCase().includes(query)) ||
      (d.platform && d.platform.toLowerCase().includes(query))
    );
  });

  if (filtered.length === 0) {
    deviceListRows.innerHTML = `
      <div style="padding: 36px 20px; text-align: center; color: #64748b; font-size: 13px;">
        ${query ? 'No devices match your search query.' : 'No devices detected yet. Devices will appear automatically when users open the app.'}
      </div>
    `;
    return;
  }

  deviceListRows.innerHTML = '';
  filtered.forEach(dev => {
    const row = document.createElement('div');
    row.className = `device-row ${dev.isCurrent ? 'current-device' : ''} ${dev.isOnline ? 'online' : 'offline'}`;

    const isMac = (dev.platform || '').toLowerCase().includes('mac');
    const osIcon = isMac ? '🍎' : '🪟';

    const firstSeenDate = dev.firstSeen ? new Date(dev.firstSeen).toLocaleDateString() : 'Unknown';
    const lastSeenDate = dev.lastSeen ? new Date(dev.lastSeen).toLocaleString() : 'Unknown';

    row.innerHTML = `
      <div class="col-name" style="flex:2;">
        <div class="device-name-line">
          <span class="device-name">${escapeHtml(dev.deviceName || 'AIRA Device')}</span>
          ${dev.isCurrent ? '<span class="badge-this-device">This Laptop (Admin)</span>' : ''}
        </div>
        <div class="device-sub-line">
          <span class="device-id-badge" title="Unique Device Identifier">${escapeHtml(dev.deviceId)}</span>
          <span class="device-version">v${escapeHtml(dev.appVersion || '1.0.0')}</span>
          <span class="device-installed" title="First Installed / Opened">First: ${firstSeenDate}</span>
        </div>
      </div>

      <div class="col-os" style="flex:1.5;">
        <span class="os-icon">${osIcon}</span>
        <span class="os-text" title="${escapeHtml(dev.os || dev.platform)}">${escapeHtml(dev.os || dev.platform)}</span>
      </div>

      <div class="col-status" style="flex:1;">
        ${dev.isOnline 
          ? '<span class="status-pill online"><span class="pulse-dot"></span> Active Now</span>'
          : '<span class="status-pill offline"><span class="gray-dot"></span> Offline</span>'
        }
      </div>

      <div class="col-time" style="flex:1.2;">
        <div class="last-seen-ago" title="${lastSeenDate}">${escapeHtml(dev.lastActiveAgo || 'Just now')}</div>
        <div class="last-seen-exact">${lastSeenDate}</div>
      </div>

      <div class="col-action" style="width:85px; text-align:center;">
        ${dev.isCurrent 
          ? '<span class="badge-protected" title="Host Machine (Admin)">Host</span>'
          : `<button type="button" class="btn-delete-device" data-id="${escapeHtml(dev.deviceId)}" data-name="${escapeHtml(dev.deviceName || 'Device')}" title="Delete and remove this foreign device">Delete</button>`
        }
      </div>
    `;

    deviceListRows.appendChild(row);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (deviceSearchInput) {
  deviceSearchInput.addEventListener('input', () => {
    renderDevicesTable(cachedDeviceData);
  });
}

if (btnRefreshDevices) {
  btnRefreshDevices.addEventListener('click', () => {
    loadDevices(false);
  });
}

if (btnClearDevicesCache) {
  btnClearDevicesCache.addEventListener('click', async () => {
    if (confirm('Clear device cache? Offline cached records will be refreshed, and blocked devices will stay blocked.')) {
      await window.electronAPI.clearDevicesCache();
      loadDevices(false);
    }
  });
}

if (deviceListRows) {
  deviceListRows.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-device');
    if (!btn) return;

    const deviceId = btn.getAttribute('data-id');
    const deviceName = btn.getAttribute('data-name') || 'this device';
    if (!deviceId) return;

    if (confirm(`Remove and block device "${deviceName}" (${deviceId}) from your dashboard?`)) {
      btn.disabled = true;
      btn.textContent = '...';
      try {
        const res = await window.electronAPI.deleteDevice(deviceId);
        if (res && res.success) {
          if (statTotalDevices) statTotalDevices.textContent = res.stats.totalDevices;
          if (statActiveDevices) statActiveDevices.textContent = res.stats.activeDevices;
          if (statWindowsDevices) statWindowsDevices.textContent = res.stats.windowsDevices;
          if (statMacDevices) statMacDevices.textContent = res.stats.macDevices;
          if (blockedDevicesCount) blockedDevicesCount.textContent = res.blockedCount || 0;

          cachedDeviceData = res.devices || [];
          cachedBlockedData = res.blockedDevices || [];
          renderDevicesTable(cachedDeviceData);
          if (blockedDevicesPanel && blockedDevicesPanel.style.display !== 'none') {
            renderBlockedTable(cachedBlockedData);
          }
        } else if (res && res.error) {
          alert('Could not remove device: ' + res.error);
          btn.disabled = false;
          btn.textContent = 'Delete';
        }
      } catch (err) {
        alert('Error removing device: ' + (err.message || err));
        btn.disabled = false;
        btn.textContent = 'Delete';
      }
    }
  });
}

// --- Blocked / Deleted Devices Management ---
function renderBlockedTable(blockedList) {
  if (!blockedDevicesList) return;

  if (!blockedList || blockedList.length === 0) {
    blockedDevicesList.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px;">
        ✓ No devices are currently deleted or blocked. All reporting devices appear normally.
      </div>
    `;
    return;
  }

  blockedDevicesList.innerHTML = '';
  blockedList.forEach(dev => {
    const row = document.createElement('div');
    row.className = 'blocked-device-row';

    const dateStr = dev.deletedAt ? new Date(dev.deletedAt).toLocaleString() : 'Recently';

    row.innerHTML = `
      <div style="flex:2;">
        <div style="font-weight:600; color:#f8fafc; font-size:13.5px; margin-bottom:4px;">
          ${escapeHtml(dev.deviceName || 'Blocked Device')}
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="device-id-badge">${escapeHtml(dev.deviceId)}</span>
          <span style="font-size:11.5px; color:#94a3b8;">${escapeHtml(dev.os || dev.platform || 'Unknown')}</span>
        </div>
      </div>
      <div style="flex:1.5; font-size:12px; color:#94a3b8;">
        <span style="color:#fb7185; font-weight:600;">Blocked:</span> ${dateStr}
      </div>
      <div style="width:110px; text-align:right;">
        <button type="button" class="btn-unblock-device" data-id="${escapeHtml(dev.deviceId)}" data-name="${escapeHtml(dev.deviceName || 'Device')}" title="Unblock and restore this device">
          ✓ Unblock
        </button>
      </div>
    `;

    blockedDevicesList.appendChild(row);
  });
}

if (btnToggleBlockedPanel) {
  btnToggleBlockedPanel.addEventListener('click', () => {
    if (!blockedDevicesPanel) return;
    if (blockedDevicesPanel.style.display === 'none') {
      blockedDevicesPanel.style.display = 'block';
      renderBlockedTable(cachedBlockedData);
    } else {
      blockedDevicesPanel.style.display = 'none';
    }
  });
}

if (btnCloseBlockedPanel) {
  btnCloseBlockedPanel.addEventListener('click', () => {
    if (blockedDevicesPanel) blockedDevicesPanel.style.display = 'none';
  });
}

if (blockedDevicesList) {
  blockedDevicesList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-unblock-device');
    if (!btn) return;

    const deviceId = btn.getAttribute('data-id');
    const deviceName = btn.getAttribute('data-name') || 'this device';
    if (!deviceId) return;

    if (confirm(`Unblock device "${deviceName}" (${deviceId})?\n\nIt will be restored and allowed to connect to your dashboard again.`)) {
      btn.disabled = true;
      btn.textContent = '...';
      try {
        const res = await window.electronAPI.unblockDevice(deviceId);
        if (res && res.success) {
          if (statTotalDevices) statTotalDevices.textContent = res.stats.totalDevices;
          if (statActiveDevices) statActiveDevices.textContent = res.stats.activeDevices;
          if (statWindowsDevices) statWindowsDevices.textContent = res.stats.windowsDevices;
          if (statMacDevices) statMacDevices.textContent = res.stats.macDevices;
          if (blockedDevicesCount) blockedDevicesCount.textContent = res.blockedCount || 0;

          cachedDeviceData = res.devices || [];
          cachedBlockedData = res.blockedDevices || [];
          renderDevicesTable(cachedDeviceData);
          renderBlockedTable(cachedBlockedData);
        } else if (res && res.error) {
          alert('Could not unblock device: ' + res.error);
          btn.disabled = false;
          btn.textContent = '✓ Unblock';
        }
      } catch (err) {
        alert('Error unblocking device: ' + (err.message || err));
        btn.disabled = false;
        btn.textContent = '✓ Unblock';
      }
    }
  });
}
