const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const VOICE_TEXTURES = [
  {
    id: 'en-US-AriaNeural',
    name: 'Aria',
    texture: 'Warm, Clear & Natural (Female)',
    lang: 'English (US)',
    gender: 'Female'
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy',
    texture: 'Deep, Calm & Confident (Male)',
    lang: 'English (US)',
    gender: 'Male'
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny',
    texture: 'Expressive, Friendly & Lively (Female)',
    lang: 'English (US)',
    gender: 'Female'
  },
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher',
    texture: 'Authoritative, Broadcasting / Sci-Fi (Male)',
    lang: 'English (US)',
    gender: 'Male'
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia',
    texture: 'Elegant & Sophisticated British (Female)',
    lang: 'English (UK)',
    gender: 'Female'
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan',
    texture: 'Charismatic British (Male)',
    lang: 'English (UK)',
    gender: 'Male'
  },
  {
    id: 'en-IN-NeerjaNeural',
    name: 'Neerja',
    texture: 'Natural & Pleasant Indian Accent (Female)',
    lang: 'English (India)',
    gender: 'Female'
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat',
    texture: 'Clear & Articulate Indian Accent (Male)',
    lang: 'English (India)',
    gender: 'Male'
  },
  {
    id: 'en-AU-NatashaNeural',
    name: 'Natasha',
    texture: 'Warm & Friendly Australian (Female)',
    lang: 'English (Australia)',
    gender: 'Female'
  },
  {
    id: 'en-US-AvaMultilingualNeural',
    name: 'Ava',
    texture: 'Futuristic AI Persona (Female)',
    lang: 'English (Multilingual)',
    gender: 'Female'
  },
  {
    id: 'kn-IN-SapnaNeural',
    name: 'Sapna (Kannada)',
    texture: 'Warm & Melodious Kannada (Female)',
    lang: 'Kannada (India)',
    gender: 'Female'
  },
  {
    id: 'kn-IN-GaganNeural',
    name: 'Gagan (Kannada)',
    texture: 'Articulate & Clear Kannada (Male)',
    lang: 'Kannada (India)',
    gender: 'Male'
  },
  {
    id: 'hi-IN-SwaraNeural',
    name: 'Swara (Hindi)',
    texture: 'Expressive & Natural Hindi (Female)',
    lang: 'Hindi (India)',
    gender: 'Female'
  },
  {
    id: 'hi-IN-MadhurNeural',
    name: 'Madhur (Hindi)',
    texture: 'Friendly & Confident Hindi (Male)',
    lang: 'Hindi (India)',
    gender: 'Male'
  }
];

class TTSService {
  getVoiceTextures() {
    return VOICE_TEXTURES;
  }

  async synthesize(text, voiceConfig = {}) {
    const voiceName = voiceConfig.voiceName || 'en-US-AriaNeural';
    const rate = voiceConfig.rate || '+0%';
    const pitch = voiceConfig.pitch || '+0Hz';
    const volume = voiceConfig.volume || '+0%';

    const tempFile = path.join(os.tmpdir(), `aira_speech_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
    let helperPath = path.join(__dirname, '..', '..', 'tts_helper.py');
    try {
      const electronApp = require('electron').app;
      if (electronApp && electronApp.isPackaged) {
        const resPath = path.join(process.resourcesPath, 'tts_helper.py');
        if (fs.existsSync(resPath)) helperPath = resPath;
      }
    } catch (e) {}

    return new Promise((resolve, reject) => {
      // Clean up text of markdown symbols that sound weird when spoken aloud
      const cleanText = text
        .replace(/```[\s\S]*?```/g, ' [code snippet omitted] ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#+\s/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/\S+/g, 'link')
        .trim();

      if (!cleanText) {
        return resolve({ success: false, error: 'Empty text' });
      }

      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      const proc = spawn(pyCmd, [helperPath, voiceName, rate, pitch, volume, tempFile]);

      proc.stdin.write(cleanText, 'utf-8');
      proc.stdin.end();

      let errOutput = '';
      proc.stderr.on('data', (data) => {
        errOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(tempFile)) {
          try {
            const buffer = fs.readFileSync(tempFile);
            const base64Audio = `data:audio/mp3;base64,${buffer.toString('base64')}`;
            // Clean up temporary file asynchronously
            fs.unlink(tempFile, () => {});
            resolve({
              success: true,
              audioDataUrl: base64Audio,
              voice: voiceName,
              cleanText
            });
          } catch (e) {
            reject(e);
          }
        } else {
          console.error('[TTS] Error running edge-tts:', errOutput);
          resolve({
            success: false,
            error: errOutput || 'TTS failed, fallback to Web Speech'
          });
        }
      });

      proc.on('error', (err) => {
        console.error('[TTS] Spawn error:', err);
        resolve({
          success: false,
          error: err.message
        });
      });
    });
  }
}

module.exports = new TTSService();
