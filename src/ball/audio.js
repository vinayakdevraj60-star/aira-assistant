class AudioManager {
  constructor() {
    this.audioElement = document.getElementById('ttsAudioPlayer');
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.micStream = null;
    this.micAnalyser = null;
    this.lastAudioUrl = null;
    this.lastSpokenText = "";
    this.isPlaying = false;
    this.isPaused = false;
    this.currentPlayToken = 0; // Guard against stale/overlapping play requests
    this.onEndedCallbacks = [];
    this.onStateChangeCallbacks = [];

    this.setupAudioListeners();
  }

  initAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;

      if (this.audioElement) {
        this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
        this.sourceNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }

      this.startAudioVisualizerLoop();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setupAudioListeners() {
    if (!this.audioElement) return;

    this.audioElement.addEventListener('play', () => {
      // Hard guarantee: cancel any speech synthesis fallback if audio element starts
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyState();
      if (window.airaOrb) window.airaOrb.setState('SPEAKING');
    });

    this.audioElement.addEventListener('pause', () => {
      if (!this.audioElement.ended) {
        this.isPaused = true;
      }
      this.notifyState();
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.notifyState();
      if (window.airaOrb) window.airaOrb.setState('IDLE');
      this.triggerEnded();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('[Audio] Audio element playback error:', e);
      // Only fallback if this playback was not explicitly stopped/cleared
      if (this.isPlaying && this.lastSpokenText) {
        this.isPlaying = false;
        this.isPaused = false;
        this.speakFallback(this.lastSpokenText);
      } else {
        this.isPlaying = false;
        this.isPaused = false;
        this.notifyState();
        this.triggerEnded();
      }
    });
  }

  triggerEnded() {
    this.onEndedCallbacks.forEach(cb => {
      try { cb(); } catch (err) { console.error('[Audio] onEnded cb error:', err); }
    });
  }

  notifyState() {
    this.onStateChangeCallbacks.forEach(cb => cb({
      isPlaying: this.isPlaying,
      isPaused: this.isPaused
    }));
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  onEnded(cb) {
    this.onEndedCallbacks.push(cb);
  }

  async playAudioData(audioDataUrl, rawText) {
    const playToken = ++this.currentPlayToken;

    // 1. Immediately silence and cancel ANY existing audio and speech synthesis
    this.stopPlaybackOnly();

    this.initAudioContext();
    this.lastAudioUrl = audioDataUrl;
    this.lastSpokenText = rawText;
    this.isPlaying = true;
    this.isPaused = false;
    this.notifyState();

    if (this.audioElement && audioDataUrl) {
      try {
        this.audioElement.src = audioDataUrl;
        await this.audioElement.play();
        // If another play request superseded this one, stop
        if (playToken !== this.currentPlayToken) {
          this.audioElement.pause();
        }
      } catch (e) {
        if (playToken === this.currentPlayToken) {
          console.warn('[Audio] Autoplay blocked or error, falling back:', e);
          this.speakFallback(rawText);
        }
      }
    } else {
      this.speakFallback(rawText);
    }
  }

  pause() {
    if (this.audioElement && this.isPlaying && !this.isPaused) {
      this.audioElement.pause();
      this.isPlaying = false;
      this.isPaused = true;
      if (window.airaOrb) window.airaOrb.setState('IDLE');
      this.notifyState();
    }
  }

  resume() {
    if (this.audioElement && this.isPaused) {
      this.initAudioContext();
      this.audioElement.play();
      this.isPlaying = true;
      this.isPaused = false;
      if (window.airaOrb) window.airaOrb.setState('SPEAKING');
      this.notifyState();
    }
  }

  // Stops audio hardware without triggering "ended" callback chain
  stopPlaybackOnly() {
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.removeAttribute('src');
      } catch (e) {}
    }
    this.isPlaying = false;
    this.isPaused = false;
  }

  stop() {
    this.currentPlayToken++;
    this.stopPlaybackOnly();
    if (window.airaOrb) window.airaOrb.setState('IDLE');
    this.notifyState();
    // Deliberately do NOT fire onEnded here, as this is an explicit user abort/stop
  }

  replay() {
    if (this.lastAudioUrl && this.audioElement) {
      this.playAudioData(this.lastAudioUrl, this.lastSpokenText);
    } else if (this.lastSpokenText) {
      this.speakFallback(this.lastSpokenText);
    }
  }

  speakFallback(text) {
    if (!window.speechSynthesis || !text) {
      this.isPlaying = false;
      this.triggerEnded();
      return;
    }

    const playToken = ++this.currentPlayToken;
    this.stopPlaybackOnly();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => {
      if (playToken !== this.currentPlayToken) {
        window.speechSynthesis.cancel();
        return;
      }
      this.isPlaying = true;
      this.isPaused = false;
      if (window.airaOrb) window.airaOrb.setState('SPEAKING');
      this.notifyState();
    };

    utterance.onend = () => {
      if (playToken === this.currentPlayToken) {
        this.isPlaying = false;
        this.isPaused = false;
        if (window.airaOrb) window.airaOrb.setState('IDLE');
        this.notifyState();
        this.triggerEnded();
      }
    };

    utterance.onerror = (err) => {
      console.warn('[Audio] SpeechSynthesis error:', err);
      if (playToken === this.currentPlayToken) {
        this.isPlaying = false;
        this.isPaused = false;
        if (window.airaOrb) window.airaOrb.setState('IDLE');
        this.notifyState();
        this.triggerEnded();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  // Hook microphone stream for visual reactivity during listening
  async attachMicrophoneMeter() {
    try {
      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!this.audioContext) this.audioContext = new AudioCtx();
        const micSource = this.audioContext.createMediaStreamSource(this.micStream);
        this.micAnalyser = this.audioContext.createAnalyser();
        this.micAnalyser.fftSize = 64;
        micSource.connect(this.micAnalyser);
      }
    } catch (e) {
      console.warn('[Audio] Could not attach mic meter:', e);
    }
  }

  startAudioVisualizerLoop() {
    const dataArray = new Uint8Array(32);

    const updateLoop = () => {
      requestAnimationFrame(updateLoop);

      let level = 0;
      if (this.isPlaying && this.analyser) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        level = (sum / dataArray.length) / 255.0;
      } else if (this.micAnalyser) {
        this.micAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        level = (sum / dataArray.length) / 255.0;
      }

      if (window.airaOrb) {
        window.airaOrb.setAudioLevel(level);
      }
    };

    updateLoop();
  }
}

window.audioManager = new AudioManager();
