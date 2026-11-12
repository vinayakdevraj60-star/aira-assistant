const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const storage = require('./storage');
const { GoogleGenAI } = require('@google/genai');

class STTService {
  async transcribeWav(base64Wav) {
    if (!base64Wav) return { success: false, text: '' };

    const cleanBase64 = base64Wav.replace(/^data:audio\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const tempFile = path.join(os.tmpdir(), `aira_stt_${Date.now()}.wav`);

    try {
      fs.writeFileSync(tempFile, buffer);

      // Method 1: Ultra-fast Gemini audio transcription (gemini-3.5-flash-lite)
      // Capped with a strict 4.5-second timeout so it never hangs
      const geminiPromise = this.transcribeWithGeminiFast(cleanBase64);
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(''), 4500));

      const geminiText = await Promise.race([geminiPromise, timeoutPromise]);
      if (geminiText && geminiText.trim().length > 0) {
        fs.unlink(tempFile, () => {});
        return { success: true, text: geminiText.trim(), engine: 'gemini-fast' };
      }

      // Method 2: Fast local Python STT (Google Speech Recognition engine)
      const pythonText = await this.runPythonSTT(tempFile);
      fs.unlink(tempFile, () => {});
      if (pythonText && pythonText.trim().length > 0) {
        return { success: true, text: pythonText.trim(), engine: 'python-sr' };
      }

      return { success: false, text: '', error: 'No speech recognized' };
    } catch (err) {
      console.error('[STT] Transcription error:', err);
      if (fs.existsSync(tempFile)) fs.unlink(tempFile, () => {});
      return { success: false, text: '', error: err.message };
    }
  }

  runPythonSTT(filePath) {
    return new Promise((resolve) => {
      let helperPath = path.join(__dirname, '..', '..', 'stt_helper.py');
      try {
        const electronApp = require('electron').app;
        if (electronApp && electronApp.isPackaged) {
          const resPath = path.join(process.resourcesPath, 'stt_helper.py');
          if (fs.existsSync(resPath)) helperPath = resPath;
        }
      } catch (e) {}
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      const proc = spawn(pyCmd, [helperPath, filePath]);

      let out = '';
      proc.stdout.on('data', (d) => { out += d.toString(); });
      proc.stderr.on('data', (d) => { console.warn('[STT-py stderr]:', d.toString()); });

      proc.on('close', () => {
        resolve(out.trim());
      });

      proc.on('error', (err) => {
        console.warn('[STT] Python spawn failed:', err);
        resolve('');
      });
    });
  }

  async transcribeWithGeminiFast(base64Audio) {
    const config = storage.getConfig();
    const apiKey = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) return '';

    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    for (const model of models) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/wav',
                    data: base64Audio
                  }
                },
                {
                  text: "Transcribe the spoken words in this audio exactly as spoken. Output ONLY the raw transcript text. If silence or noise, return an empty string."
                }
              ]
            }
          ]
        });

        let text = (response.text || '').trim();
        const isNoiseToken = /^(<noise>|\[noise\]|\*noise\*|\(noise\)|<cough>|\[cough\]|<music>|\[music\]|\[applause\]|<applause>|\[laughter\]|<laughter>|\[background.*\]|\(background.*\)|\[silence\]|<silence>|\[no speech\]|\[inaudible\]|<inaudible>|\[static\]|<static>|none|silent|\(silence\)|00:00|0:00|\d{1,2}:\d{2})$/i;
        if (!text || isNoiseToken.test(text)) {
          return '';
        }

        text = text.replace(/(<noise>|\[noise\]|\*noise\*|<cough>|\[cough\]|<music>|\[music\]|\[applause\]|\[laughter\]|\[background noise\])/gi, '').trim();
        if (text) return text;
      } catch (e) {
        console.warn(`[STT] Gemini (${model}) error:`, e.message);
      }
    }
    return '';
  }
}

module.exports = new STTService();
