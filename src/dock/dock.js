const dockTrigger = document.getElementById('dockTrigger');

let isListening = false;
let recognition = null;
let wakeWords = ['hi aira', 'hey aira', 'wake up aira', 'hello aira', 'aira'];

// Click event to wake ball
dockTrigger.addEventListener('click', async () => {
  if (window.electronAPI) {
    await window.electronAPI.showBall();
  }
});

// Load config for wake words
async function initDock() {
  if (window.electronAPI) {
    const config = await window.electronAPI.getConfig();
    if (config && config.wakeWords) {
      wakeWords = config.wakeWords.map(w => w.toLowerCase());
    }

    window.electronAPI.onConfigUpdated((newConfig) => {
      if (newConfig && newConfig.wakeWords) {
        wakeWords = newConfig.wakeWords.map(w => w.toLowerCase());
      }
    });
  }

  setupWakeWordListener();
}

function setupWakeWordListener() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('[Dock] SpeechRecognition not supported in this window.');
    return;
  }

  try {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        for (const wakeWord of wakeWords) {
          if (transcript.includes(wakeWord)) {
            if (window.electronAPI) {
              window.electronAPI.showBall();
            }
            break;
          }
        }
      }
    };

    recognition.onerror = (event) => {
      // Ignore not-allowed or abort errors and retry gently
      if (event.error !== 'aborted') {
        setTimeout(() => startListening(), 2000);
      }
    };

    recognition.onend = () => {
      isListening = false;
      setTimeout(() => startListening(), 1000);
    };

    startListening();
  } catch (err) {
    console.error('[Dock] Speech recognition setup failed:', err);
  }
}

function startListening() {
  if (recognition && !isListening) {
    try {
      recognition.start();
    } catch (e) {
      // Already running
    }
  }
}

initDock();
