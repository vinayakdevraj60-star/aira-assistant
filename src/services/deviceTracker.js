const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const dgram = require('dgram');
const storage = require('./storage');

let electronApp = null;
try {
  electronApp = require('electron').app;
} catch (e) {}

function resolveStoragePath(filename) {
  if (electronApp && typeof electronApp.getPath === 'function') {
    try {
      const userDataDir = electronApp.getPath('userData');
      if (userDataDir) {
        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
        }
        return path.join(userDataDir, filename);
      }
    } catch (err) {}
  }
  return path.join(__dirname, '..', '..', filename);
}

const CACHE_PATH = resolveStoragePath('devices_cache.json');
const DELETED_PATH = resolveStoragePath('deleted_devices.json');
const DEFAULT_CHANNEL = 'aira_telemetry_vinay_aira_v1';
const LAN_PORT = 41234;

class DeviceTrackerService {
  constructor() {
    this.deviceId = null;
    this.deviceName = null;
    this.platform = null;
    this.osSummary = null;
    this.appVersion = '1.0.0';
    this.firstSeen = null;
    this.heartbeatTimer = null;
    this.udpSocket = null;
    this.cachedDevices = new Map();
    this.deletedDevices = new Map();

    this.initDeviceInfo();
    this.loadDeletedDevices();
    this.loadCachedDevices();
  }

  loadDeletedDevices() {
    try {
      if (fs.existsSync(DELETED_PATH)) {
        const raw = fs.readFileSync(DELETED_PATH, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.deletedDevices = new Map();
          list.forEach(item => {
            if (typeof item === 'string') {
              this.deletedDevices.set(item, {
                deviceId: item,
                deviceName: 'Blocked Device',
                platform: 'Unknown',
                os: '',
                deletedAt: new Date().toISOString()
              });
            } else if (item && item.deviceId) {
              this.deletedDevices.set(item.deviceId, item);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[DeviceTracker] Error loading deleted devices:', e);
    }
  }

  saveDeletedDevices() {
    try {
      const list = Array.from(this.deletedDevices.values());
      fs.writeFileSync(DELETED_PATH, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[DeviceTracker] Error saving deleted devices:', e);
    }
  }

  getBlockedDevices() {
    return Array.from(this.deletedDevices.values());
  }

  async unblockDevice(deviceId) {
    if (!deviceId) return { success: false, error: 'Device ID required' };
    this.deletedDevices.delete(deviceId);
    this.saveDeletedDevices();
    return {
      success: true,
      deviceId,
      blockedDevices: this.getBlockedDevices(),
      ...(await this.getDevices())
    };
  }

  initDeviceInfo() {
    try {
      const config = storage.getConfig() || {};
      
      // Persistent device ID
      if (config.deviceId) {
        this.deviceId = config.deviceId;
      } else {
        const seed = `${os.hostname()}-${os.platform()}-${os.arch()}-${Date.now()}-${Math.random()}`;
        const hash = crypto.createHash('md5').update(seed).digest('hex').substring(0, 8).toUpperCase();
        this.deviceId = `AIRA-${hash}`;
        storage.saveConfig({ deviceId: this.deviceId });
      }

      // First seen timestamp
      if (config.deviceFirstSeen) {
        this.firstSeen = config.deviceFirstSeen;
      } else {
        this.firstSeen = new Date().toISOString();
        storage.saveConfig({ deviceFirstSeen: this.firstSeen });
      }

      // Device Name & OS detection
      let user = '';
      try {
        const u = os.userInfo();
        if (u && u.username) user = u.username;
      } catch (e) {}
      
      this.deviceName = os.hostname() || (user ? `${user}-PC` : 'AIRA Device');

      const plat = process.platform;
      if (plat === 'win32') {
        const rel = os.release();
        const build = parseInt(rel.split('.')[2] || '0', 10);
        const winVer = build >= 22000 ? 'Windows 11' : 'Windows 10';
        this.platform = 'Windows';
        this.osSummary = `${winVer} (${os.arch()})`;
      } else if (plat === 'darwin') {
        this.platform = 'macOS';
        this.osSummary = `macOS ${os.release()} (${os.arch()})`;
      } else if (plat === 'linux') {
        this.platform = 'Linux';
        this.osSummary = `Linux ${os.release()} (${os.arch()})`;
      } else {
        this.platform = plat;
        this.osSummary = `${plat} (${os.arch()})`;
      }
    } catch (err) {
      console.error('[DeviceTracker] Error initializing device info:', err);
      this.deviceId = this.deviceId || 'AIRA-GENERIC';
      this.deviceName = 'AIRA Device';
      this.platform = process.platform === 'win32' ? 'Windows' : 'macOS';
      this.osSummary = process.platform;
    }
  }

  getChannel() {
    const config = storage.getConfig() || {};
    return config.deviceSyncChannel || DEFAULT_CHANNEL;
  }

  loadCachedDevices() {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item && item.deviceId && !this.deletedDevices.has(item.deviceId)) {
              this.cachedDevices.set(item.deviceId, item);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[DeviceTracker] Error loading cached devices:', e);
    }
    this.recordSelf();
  }

  saveCachedDevices() {
    try {
      const list = Array.from(this.cachedDevices.values());
      fs.writeFileSync(CACHE_PATH, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[DeviceTracker] Error saving cached devices:', e);
    }
  }

  recordSelf(status = 'online') {
    const now = new Date().toISOString();
    const selfData = {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      platform: this.platform,
      os: this.osSummary,
      appVersion: this.appVersion,
      firstSeen: this.firstSeen || now,
      lastSeen: now,
      status: status,
      isCurrent: true
    };
    this.cachedDevices.set(this.deviceId, selfData);
    this.saveCachedDevices();
    return selfData;
  }

  async sendHeartbeat(status = 'online') {
    const selfData = this.recordSelf(status);
    const channel = this.getChannel();

    // 1. Cloud Heartbeat via ntfy.sh
    try {
      if (typeof fetch === 'function') {
        await fetch(`https://ntfy.sh/${channel}`, {
          method: 'POST',
          headers: {
            'Title': 'aira-device-ping',
            'Tags': ['desktop', this.platform.toLowerCase()],
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(selfData)
        });
      }
    } catch (e) {
      // Offline or network error - expected occasionally
    }

    // 2. LAN UDP Broadcast (for devices on the same Wi-Fi)
    this.broadcastLanBeacon(selfData);
  }

  broadcastLanBeacon(data) {
    try {
      const message = Buffer.from(JSON.stringify({ type: 'aira-lan-ping', ...data }));
      const client = dgram.createSocket('udp4');
      client.bind(() => {
        try {
          client.setBroadcast(true);
          client.send(message, 0, message.length, LAN_PORT, '255.255.255.255', () => {
            try { client.close(); } catch (e) {}
          });
        } catch (e) {
          try { client.close(); } catch (err) {}
        }
      });
    } catch (e) {}
  }

  startLanListener() {
    try {
      this.udpSocket = dgram.createSocket('udp4');
      this.udpSocket.on('error', (err) => {
        // Port might be in use if another instance is running locally
        try { this.udpSocket.close(); } catch (e) {}
        this.udpSocket = null;
      });

      this.udpSocket.on('message', (msg) => {
        try {
          const parsed = JSON.parse(msg.toString('utf-8'));
          if (parsed && parsed.deviceId && parsed.deviceId !== this.deviceId && !this.deletedDevices.has(parsed.deviceId)) {
            this.cachedDevices.set(parsed.deviceId, {
              ...parsed,
              isCurrent: false,
              source: 'LAN'
            });
            this.saveCachedDevices();
          }
        } catch (e) {}
      });

      this.udpSocket.bind(LAN_PORT, () => {
        try {
          this.udpSocket.setBroadcast(true);
        } catch (e) {}
      });
    } catch (e) {}
  }

  start() {
    this.sendHeartbeat('online');
    this.startLanListener();

    // Heartbeat every 45 seconds
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat('online');
    }, 45000);
  }

  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.udpSocket) {
      try { this.udpSocket.close(); } catch (e) {}
      this.udpSocket = null;
    }
    // Fire-and-forget closing heartbeat
    try {
      this.sendHeartbeat('offline');
    } catch (e) {}
  }

  async getDevices() {
    const channel = this.getChannel();
    this.recordSelf('online');

    // Poll latest messages from cloud
    try {
      if (typeof fetch === 'function') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(`https://ntfy.sh/${channel}/json?poll=1`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          const lines = text.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const item = JSON.parse(line);
              if (item.event === 'message' && item.message) {
                let data = null;
                try {
                  data = JSON.parse(item.message);
                } catch (e) {}

                if (data && data.deviceId && !this.deletedDevices.has(data.deviceId)) {
                  const existing = this.cachedDevices.get(data.deviceId);
                  const newLastSeen = data.lastSeen || new Date(item.time * 1000).toISOString();
                  const firstSeen = existing?.firstSeen || data.firstSeen || newLastSeen;

                  this.cachedDevices.set(data.deviceId, {
                    ...(existing || {}),
                    ...data,
                    firstSeen,
                    lastSeen: newLastSeen,
                    isCurrent: data.deviceId === this.deviceId
                  });
                }
              }
            } catch (err) {}
          }
          this.saveCachedDevices();
        }
      }
    } catch (e) {
      // Cloud unreachable, proceed with cached devices
    }

    // Process all devices & compute live statistics
    const now = Date.now();
    const ONLINE_WINDOW_MS = 3.5 * 60 * 1000; // 3.5 minutes
    const deviceList = [];

    let totalDevices = 0;
    let activeDevices = 0;
    let windowsDevices = 0;
    let macDevices = 0;

    for (const [id, dev] of this.cachedDevices.entries()) {
      totalDevices++;
      const isSelf = (id === this.deviceId);
      const lastSeenTime = dev.lastSeen ? new Date(dev.lastSeen).getTime() : 0;
      const diffMs = now - lastSeenTime;

      const isOnline = isSelf || (dev.status !== 'offline' && diffMs <= ONLINE_WINDOW_MS);
      if (isOnline) activeDevices++;

      const platformLower = (dev.platform || '').toLowerCase();
      if (platformLower.includes('win')) windowsDevices++;
      else if (platformLower.includes('mac') || platformLower.includes('darwin')) macDevices++;

      // Relative time string
      let lastActiveAgo = 'Just now';
      if (!isSelf) {
        if (diffMs < 60000) lastActiveAgo = 'Just now';
        else if (diffMs < 3600000) lastActiveAgo = `${Math.floor(diffMs / 60000)}m ago`;
        else if (diffMs < 86400000) lastActiveAgo = `${Math.floor(diffMs / 3600000)}h ago`;
        else lastActiveAgo = `${Math.floor(diffMs / 86400000)}d ago`;
      }

      deviceList.push({
        deviceId: id,
        deviceName: dev.deviceName || 'AIRA Node',
        platform: dev.platform || 'Unknown',
        os: dev.os || dev.platform || 'Unknown OS',
        appVersion: dev.appVersion || '1.0.0',
        firstSeen: dev.firstSeen || dev.lastSeen,
        lastSeen: dev.lastSeen,
        lastActiveAgo,
        isOnline,
        isCurrent: isSelf,
        status: isOnline ? 'online' : 'offline'
      });
    }

    // Sort: Current device first, then other Online devices, then newest lastSeen
    deviceList.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });

    return {
      success: true,
      stats: {
        totalDevices,
        activeDevices,
        windowsDevices,
        macDevices
      },
      currentDeviceId: this.deviceId,
      channel,
      blockedCount: this.deletedDevices.size,
      blockedDevices: this.getBlockedDevices(),
      devices: deviceList
    };
  }

  async deleteDevice(deviceId) {
    if (!deviceId || deviceId === this.deviceId) {
      return { success: false, error: 'Cannot delete current active device' };
    }
    const existing = this.cachedDevices.get(deviceId) || {};
    this.cachedDevices.delete(deviceId);
    this.deletedDevices.set(deviceId, {
      deviceId,
      deviceName: existing.deviceName || 'Unknown Device',
      platform: existing.platform || 'Unknown',
      os: existing.os || '',
      deletedAt: new Date().toISOString()
    });
    this.saveDeletedDevices();
    this.saveCachedDevices();
    return await this.getDevices();
  }

  clearDevicesCache() {
    this.cachedDevices.clear();
    // Do NOT clear deletedDevices. Blocked devices must remain permanently blocked.
    this.saveCachedDevices();
    this.recordSelf('online');
    return this.getDevices();
  }
}

module.exports = new DeviceTrackerService();
