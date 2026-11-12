# 🌟 AIRA - 3D AI Vision & Voice Assistant

**AIRA** (Autonomous Intelligent Responsive Assistant) is an always-accessible laptop assistant featuring an interactive 3D energy ball attached to your screen, continuous voice interaction, screen vision, multi-image analysis, real-time Google Search grounding (for live sports scores and breaking news), diverse neural voice textures, audio controls (Pause, Resume, Stop, Replay), and a PIN-protected Admin Console visible only to you.

---

## 🚀 Key Features

1. **Always-Attached 3D Assistant Ball**:
   - Floating, transparent, always-on-top 3D plasma orb powered by Three.js & WebGL.
   - Fluid audio-reactive particle waves that pulse and ripple when listening or speaking.
   - Distinct state animations: *Idle*, *Listening* (emerald/cyan), *Thinking* (golden solar rings), *Speaking* (cyber magenta), and *Screen Scanning* (vertical laser sweep).

2. **Edge Dock Button**:
   - A glowing vertical dock trigger attached to the right edge of your laptop screen.
   - Click the button or say **"Hi Aira"** to wake up and expand the 3D ball.

3. **Voice Activation & Natural Listening**:
   - Wake Word: Say **"Hi Aira"** or **"Hey Aira"** to wake the assistant and start listening.
   - Sleep Word: Say **"Bye Aira"** or **"Close Aira"** to immediately close and dock the ball.
   - Clear real-time voice speech recognition with silence auto-submit.

4. **Audio Playback Controls**:
   - ⏹️ **Stop**: Instantly silence speech.
   - ⏸️ / ▶️ **Pause & Resume**: Pause speech mid-sentence and resume whenever you want.
   - 🔁 **Read Again**: Replay the previous answer from the start.
   - Also voice controllable (*"Aira, pause"*, *"Aira, stop"*, *"Aira, read again"*).

5. **Screen Vision & Multi-Image Intelligence**:
   - 👁️ **"See Screen" Button / "Aira, look at my screen"**: Takes an instant high-res screenshot of your active laptop display using Electron's `desktopCapturer` and sends it to Gemini multimodal vision.
   - 🖼️ **Multiple Images**: Drag and drop or attach multiple diagrams, photos, or documents to solve complex queries together.

6. **Live Sports & Breaking News (Search Grounding)**:
   - Built on Gemini 2.5 Flash / 2.0 with Google Search Grounding enabled.
   - Retrieves live sports scores, today's news updates, stock trends, weather, and current events.

7. **Voice Studio (Diverse Voice Textures)**:
   - High-fidelity Neural TTS powered by Edge-TTS.
   - 10+ Voice Textures:
     - *Aria* (Warm, Clear & Natural Female)
     - *Guy* (Deep, Calm & Confident Male)
     - *Jenny* (Expressive & Lively Female)
     - *Christopher* (Authoritative / Sci-Fi Male)
     - *Sonia* (Sophisticated British Female)
     - *Ryan* (Charismatic British Male)
     - *Neerja* (Melodic Indian Accent Female)
     - *Prabhat* (Clear Indian Accent Male)
     - *Natasha* (Warm Australian Female)
     - *Ava* (Futuristic AI Persona)
   - Real-time Pitch (-40Hz to +40Hz) and Speed (-30% to +40%) adjustment sliders with live voice sample preview.

8. **Private Admin Console (Master Window)**:
   - Separate, dedicated window visible only to you.
   - Protected by a Master PIN code (Default: `1234`, customizable).
   - Secret Hotkey: `Ctrl + Shift + A` (or right-click system tray -> "Open Admin Console").
   - Controls: Gemini API key setup, Model picker, Search Grounding toggle, Voice Studio, Display selector, Wake/Sleep phrase customization, and Conversation Audit Logs.

---

## ⌨️ Global Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Alt + A` | Wake / Toggle 3D Assistant Ball |
| `Ctrl + Shift + A` | Open Private Master Admin Console |

---

## 🎙️ Spoken Voice Commands

- **"Hi Aira"** / **"Hey Aira"** — Wakes up the 3D ball and starts listening.
- **"Bye Aira"** — Bids farewell and closes the ball completely.
- **"Aira, stop"** — Stops the current voice answer.
- **"Aira, pause"** — Pauses voice speech.
- **"Aira, resume"** — Resumes voice speech.
- **"Aira, read again"** — Reads the last answer from the beginning.
- **"Aira, what's on my screen?"** — Analyzes your current laptop screen.

---

## 🛠️ Installation & Launch

### 1. Requirements
- Node.js (v18+)
- Python (3.10+) with `edge-tts` (already installed)

### 2. Start the Application
Open PowerShell or Command Prompt in `C:\Users\vinay\aira-assistant` and run:

```bash
npm start
```
Or simply double-click:
```
start-aira.bat
```

### 3. Setting your Google Gemini API Key
1. Press `Ctrl + Shift + A` to open the Admin Console.
2. Enter the default Master PIN: `1234`.
3. Paste your Gemini API key (obtainable free from [Google AI Studio](https://aistudio.google.com/)).
4. Click **"Test Key"**, then **"Save AI Settings"**.
