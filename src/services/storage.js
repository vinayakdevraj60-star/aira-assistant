const fs = require('fs');
const path = require('path');

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
        const userFilePath = path.join(userDataDir, filename);
        const rootFilePath = path.join(__dirname, '..', '..', filename);
        if (!fs.existsSync(userFilePath) && fs.existsSync(rootFilePath)) {
          try {
            fs.copyFileSync(rootFilePath, userFilePath);
          } catch (copyErr) {}
        }
        return userFilePath;
      }
    } catch (err) {}
  }
  return path.join(__dirname, '..', '..', filename);
}

const CONFIG_PATH = resolveStoragePath('config.json');
const HISTORY_PATH = resolveStoragePath('history.json');
const STUDY_PACKS_PATH = resolveStoragePath('study_packs.json');

const DEFAULT_CONFIG = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  modelName: 'gemini-3.5-flash-lite',
  enableSearch: true,
  systemPrompt: "You are Aira, a smart, perceptive, and charming 3D AI vision and voice assistant always attached to the user's laptop. You can see their screen, inspect multiple photos/diagrams, and answer anything with live real-time accuracy (sports, breaking news, weather, tech). When an image or screen snapshot is attached, examine it in detail and answer specifically about what is visible on the user's laptop desktop and active applications. If no screen snapshot is attached, clearly state that you need Screen Vision active to view their screen. Keep spoken answers natural, clear, engaging, and direct.",
  voice: {
    provider: 'edge-tts',
    voiceName: 'en-US-AriaNeural',
    texture: 'Warm & Natural',
    pitch: '+0Hz',
    rate: '+0%',
    volume: '+0%'
  },
  wakeWords: ['hi', 'hey', 'hello', 'hi aira', 'hey aira', 'wake up aira', 'hello aira', 'aira'],
  sleepWords: ['bye', 'goodbye', 'bye aira', 'goodbye aira', 'close aira', 'close app', 'exit'],
  adminPin: '1234',
  hotkeys: {
    toggleBall: 'CommandOrControl+Alt+A',
    openAdmin: 'CommandOrControl+Shift+A'
  },
  dockPosition: 'right-center',
  ballScale: 1.0,
  autoSpeak: true,
  audioInputDeviceId: 'auto',
  micSensitivity: 1.6,
  handsFreeMode: true,
  liveScreenVision: true
};

class StorageService {
  constructor() {
    this.config = this.loadConfig();
    this.history = this.loadHistory();
    this.studyPacks = this.loadStudyPacks();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('[Storage] Error loading config:', e);
    }
    this.saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  saveConfig(newConfig) {
    try {
      if (newConfig && newConfig.voiceName) {
        if (!newConfig.voice) newConfig.voice = { ...(this.config.voice || DEFAULT_CONFIG.voice) };
        newConfig.voice.voiceName = newConfig.voiceName;
      }
      this.config = { ...this.config, ...newConfig };
      if (newConfig && newConfig.voice) {
        this.config.voice = { ...(this.config.voice || DEFAULT_CONFIG.voice), ...newConfig.voice };
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('[Storage] Error saving config:', e);
      return false;
    }
  }

  getConfig() {
    return this.config;
  }

  loadHistory() {
    try {
      if (fs.existsSync(HISTORY_PATH)) {
        const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[Storage] Error loading history:', e);
    }
    return [];
  }

  addHistoryEntry(entry) {
    try {
      this.history.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...entry
      });
      // Keep up to 500 entries for long-term memory
      if (this.history.length > 500) {
        this.history = this.history.slice(0, 500);
      }
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.history, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Storage] Error saving history:', e);
    }
  }

  getHistory() {
    return this.history;
  }

  getMemorySummary(limit = 20) {
    try {
      const recent = this.history.slice(0, limit);
      if (recent.length === 0) return '';
      // Order chronologically so oldest of recent comes first
      const ordered = [...recent].reverse();
      const lines = ordered.map(item => {
        const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const shortResp = (item.response || '').replace(/\s+/g, ' ').substring(0, 160);
        return `[${timeStr}] User asked: "${item.prompt}" -> AIRA answered: "${shortResp}${item.response && item.response.length > 160 ? '...' : ''}"`;
      });
      return lines.join('\n');
    } catch (e) {
      return '';
    }
  }

  clearHistory() {
    this.history = [];
    try {
      fs.writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2), 'utf-8');
    } catch (e) {
      console.error('[Storage] Error clearing history:', e);
    }
  }

  loadStudyPacks() {
    try {
      if (fs.existsSync(STUDY_PACKS_PATH)) {
        const raw = fs.readFileSync(STUDY_PACKS_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[Storage] Error loading study packs:', e);
    }
    return [];
  }

  saveStudyPack(pack) {
    try {
      if (!pack) return null;
      const entry = {
        id: pack.id || `pack_${Date.now()}`,
        title: pack.title || `Study Pack (${new Date().toLocaleDateString()})`,
        timestamp: new Date().toISOString(),
        items: Array.isArray(pack.items) ? pack.items : []
      };
      // Place newest pack first
      this.studyPacks.unshift(entry);
      // Keep up to 100 study packs
      if (this.studyPacks.length > 100) {
        this.studyPacks = this.studyPacks.slice(0, 100);
      }
      fs.writeFileSync(STUDY_PACKS_PATH, JSON.stringify(this.studyPacks, null, 2), 'utf-8');
      console.log(`[Storage] Saved study pack "${entry.title}" with ${entry.items.length} Q&A pairs.`);
      return entry;
    } catch (e) {
      console.error('[Storage] Error saving study pack:', e);
      return null;
    }
  }

  getStudyPacks() {
    return this.studyPacks;
  }

  getLatestStudyPack() {
    return this.studyPacks.length > 0 ? this.studyPacks[0] : null;
  }

  deleteStudyPack(id) {
    try {
      this.studyPacks = this.studyPacks.filter(p => p.id !== id);
      fs.writeFileSync(STUDY_PACKS_PATH, JSON.stringify(this.studyPacks, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('[Storage] Error deleting study pack:', e);
      return false;
    }
  }

  clearStudyPacks() {
    this.studyPacks = [];
    try {
      fs.writeFileSync(STUDY_PACKS_PATH, JSON.stringify([], null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('[Storage] Error clearing study packs:', e);
      return false;
    }
  }
}

module.exports = new StorageService();
