class AudioRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.input = null;
    this.muteGain = null;
    this.preampGain = null;
    this.highpass = null;
    this.lowpass = null;
    this.vocalBand = null;
    this.dynamicsCompressor = null;
    this.isRecording = false;
    this.audioBuffers = [];
    this.targetSampleRate = 16000;
    this.onVolumeCallbacks = [];
    this.selectedDeviceId = 'auto';
    this.sensitivityMultiplier = 1.6; // Sensitivity multiplier for earbud mics

    // Continuous Hands-Free VAD Mode
    this.isContinuous = false;
    this.isSpeaking = false;
    this.isPaused = false;
    this.preBuffer = [];
    this.maxPreBufferChunks = 12; // ~1s pre-speech audio buffer so initial words/syllables are never cut off
    this.silenceTimer = null;
    this.maxSpeechTimer = null;
    this.initialWaitTimer = null;
    this.consecutiveSpeechFrames = 0;
    this.hasUserSpoken = false;
    this.peakRms = 0;
    this.silenceAccumulatedMs = 0;
    this.onSpeechStartCb = null;
    this.onSpeechEndCb = null;
    this.onNoSpeechCb = null;
    this.noiseFloor = 0.003;
    this.vadThreshold = 0.006; // RMS voice activity threshold (lowered to catch softer/distant speech)

    // Spectral voice detection state
    this.recentSpectrumFrames = [];
    this.maxSpectrumFrames = 5;
  }

  setSensitivity(val) {
    this.sensitivityMultiplier = Math.max(0.5, Math.min(4.0, val || 1.6));
  }

  setDeviceId(deviceId) {
    this.selectedDeviceId = deviceId || 'auto';
  }

  onVolume(cb) {
    this.onVolumeCallbacks.push(cb);
  }

  /**
   * Enumerate all connected audio input devices (microphones/earbuds)
   */
  static async getAudioInputDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }

      // Check if we need to request permission once to get labels
      let devices = await navigator.mediaDevices.enumerateDevices();
      const hasLabels = devices.some(d => d.kind === 'audioinput' && d.label);

      if (!hasLabels) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(t => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
        } catch (e) {
          console.warn('[AudioRecorder] Perm request error during enumeration:', e);
        }
      }

      const earbudRegex = /(earbuds?|airbass|headset|buds|airpods?|bluetooth|wireless|headphone|hands-free|freebuds)/i;
      const laptopMicRegex = /(realtek|built-in|internal|integrated|array|high definition audio|laptop|sst)/i;

      return devices
        .filter(d => d.kind === 'audioinput')
        .map(d => {
          const isEarbuds = earbudRegex.test(d.label);
          const isLaptopMic = laptopMicRegex.test(d.label);
          return {
            deviceId: d.deviceId,
            groupId: d.groupId,
            label: d.label || (isEarbuds ? 'Wireless Earbuds' : (isLaptopMic ? 'Laptop Microphone' : `Microphone ${d.deviceId.substring(0, 5)}`)),
            isEarbuds,
            isLaptopMic,
            isDefault: d.deviceId === 'default'
          };
        });
    } catch (err) {
      console.error('[AudioRecorder] Error enumerating devices:', err);
      return [];
    }
  }

  /**
   * Determine the target microphone deviceId to use
   */
  async resolveTargetDeviceId(preferredId) {
    const devices = await AudioRecorder.getAudioInputDevices();
    if (!devices || devices.length === 0) return undefined;

    // Explicit laptop mic selection
    if (preferredId === 'laptop') {
      const laptop = devices.find(d => d.isLaptopMic);
      if (laptop) {
        console.log('[AudioRecorder] Selected laptop microphone:', laptop.label);
        return laptop.deviceId;
      }
    }

    // If a specific device is selected and exists, use it
    if (preferredId && preferredId !== 'auto' && preferredId !== 'default') {
      const match = devices.find(d => d.deviceId === preferredId);
      if (match) return match.deviceId;
    }

    // Auto-detect: Prioritize Bluetooth earbuds/headsets if connected
    const earbuds = devices.find(d => d.isEarbuds);
    if (earbuds) {
      console.log('[AudioRecorder] Auto-detected earbuds microphone:', earbuds.label);
      return earbuds.deviceId;
    }

    // Otherwise, use laptop microphone if detected
    const laptop = devices.find(d => d.isLaptopMic);
    if (laptop) {
      console.log('[AudioRecorder] Using laptop microphone:', laptop.label);
      return laptop.deviceId;
    }

    // Fallback to default or first device
    const defaultDev = devices.find(d => d.isDefault);
    return defaultDev ? defaultDev.deviceId : (devices[0]?.deviceId || undefined);
  }

  /**
   * Start continuous hands-free listening with automated voice activity detection (VAD)
   */
  async startContinuous(options = {}) {
    this.isContinuous = true;
    this.isSpeaking = false;
    this.hasUserSpoken = false;
    this.isPaused = false;
    this.consecutiveSpeechFrames = 0;
    clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
    clearTimeout(this.maxSpeechTimer);
    this.maxSpeechTimer = null;
    this.preBuffer = [];
    this.audioBuffers = [];
    this.onSpeechStartCb = options.onSpeechStart || null;
    this.onSpeechEndCb = options.onSpeechEnd || null;
    this.onNoSpeechCb = options.onNoSpeech || null;

    if (options.onVolume) {
      this.onVolumeCallbacks = [options.onVolume];
    }
    await this.start(options.deviceId || this.selectedDeviceId);
    // Explicitly guarantee isContinuous stays true
    this.isContinuous = true;
  }

  /**
   * Start manual click-to-speak recording with automatic sentence completion
   */
  async startManual(options = {}) {
    this.isContinuous = true;
    this.isSpeaking = true;
    this.hasUserSpoken = false;
    this.isPaused = false;
    this.audioBuffers = [];
    this.preBuffer = [];
    this.onSpeechEndCb = options.onSpeechEnd || null;
    this.onSpeechStartCb = options.onSpeechStart || null;
    this.onNoSpeechCb = options.onNoSpeech || null;

    if (options.onVolume) {
      this.onVolumeCallbacks = [options.onVolume];
    }
    await this.start(options.deviceId || this.selectedDeviceId);
    this.isContinuous = true;
    this.forceSpeechStart();
  }

  /**
   * Force speech recording immediately (e.g. user clicked Speak button)
   */
  forceSpeechStart() {
    this.isPaused = false;
    this.isSpeaking = true;
    this.hasUserSpoken = false;
    this.peakRms = 0.015;
    this.silenceAccumulatedMs = 0;
    this.consecutiveSpeechFrames = 0;
    this.audioBuffers = [...this.preBuffer];
    this.preBuffer = [];

    clearTimeout(this.silenceTimer);
    clearTimeout(this.maxSpeechTimer);
    clearTimeout(this.initialWaitTimer);

    // Allow user 7 seconds grace window to begin speaking their sentence
    this.initialWaitTimer = setTimeout(() => {
      if (!this.hasUserSpoken && this.isSpeaking) {
        console.log('[AudioRecorder] Speak clicked but no speech detected within 7s');
        this.isSpeaking = false;
        this.audioBuffers = [];
        this.preBuffer = [];
        if (this.onNoSpeechCb) this.onNoSpeechCb();
      }
    }, 7000);

    this.maxSpeechTimer = setTimeout(() => this.triggerSpeechEnd(), 60000);

    if (this.onSpeechStartCb) {
      this.onSpeechStartCb();
    }
  }

  pause() {
    this.isPaused = true;
    this.isSpeaking = false;
    this.hasUserSpoken = false;
    this.peakRms = 0;
    this.silenceAccumulatedMs = 0;
    this.consecutiveSpeechFrames = 0;
    clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
    clearTimeout(this.maxSpeechTimer);
    this.maxSpeechTimer = null;
    clearTimeout(this.initialWaitTimer);
    this.initialWaitTimer = null;
    this.preBuffer = [];
    this.audioBuffers = [];
  }

  async resume() {
    this.isPaused = false;
    this.isSpeaking = false;
    this.hasUserSpoken = false;
    this.peakRms = 0;
    this.silenceAccumulatedMs = 0;
    this.consecutiveSpeechFrames = 0;
    clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
    clearTimeout(this.maxSpeechTimer);
    this.maxSpeechTimer = null;
    clearTimeout(this.initialWaitTimer);
    this.initialWaitTimer = null;
    this.preBuffer = [];
    this.audioBuffers = [];
    this.isContinuous = true;

    const isStreamAlive = this.mediaStream && this.mediaStream.getAudioTracks().some(t => t.readyState === 'live');
    if (!this.audioContext || this.audioContext.state === 'closed' || !isStreamAlive || !this.processor) {
      console.log('[AudioRecorder] Re-acquiring audio capture on resume');
      await this.start(this.selectedDeviceId);
      this.isContinuous = true;
    } else if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {}
    }
  }

  async start(preferredDeviceId = null) {
    if (this.isRecording) {
      const wasContinuous = this.isContinuous;
      await this.stop();
      this.isContinuous = wasContinuous;
    }

    const deviceId = await this.resolveTargetDeviceId(preferredDeviceId || this.selectedDeviceId);
    console.log('[AudioRecorder] Starting microphone capture on device:', deviceId || 'system-default');

    // ═══════════════════════════════════════════════════════════════════════
    // SIRI-QUALITY AUDIO CAPTURE CONSTRAINTS
    // ═══════════════════════════════════════════════════════════════════════
    // Enable ALL hardware-level audio processing for crystal-clear voice capture.
    // This is what Siri, Google Assistant, and Alexa do — they let the hardware
    // handle noise suppression and gain control BEFORE the audio reaches software.
    //
    // Previously noiseSuppression was disabled, which meant every fan hum,
    // keyboard click, and ambient room noise was captured and sent to the
    // transcription model, severely degrading accuracy.
    // ═══════════════════════════════════════════════════════════════════════
    const audioConstraints = {
      echoCancellation: true,
      autoGainControl: true,
      noiseSuppression: true,           // ENABLED: Let hardware/Chromium filter steady background noise
      googEchoCancellation: true,
      googAutoGainControl: true,
      googNoiseSuppression: true,       // ENABLED: Google's advanced noise suppression
      googHighpassFilter: true,         // ENABLED: Hardware high-pass to cut sub-bass rumble
      googTypingNoiseDetection: true,   // ENABLED: Suppress keyboard typing sounds
      googAudioMirroring: false,
      channelCount: 1,
      sampleRate: { ideal: 16000 },     // Request 16kHz directly — optimal for speech recognition
      sampleSize: { ideal: 16 }         // 16-bit depth
    };

    if (deviceId && deviceId !== 'default') {
      audioConstraints.deviceId = { ideal: deviceId };
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    } catch (err) {
      console.warn('[AudioRecorder] Ideal constraints failed, trying with noiseSuppression only:', err);
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true,
            channelCount: 1,
            ...(deviceId && deviceId !== 'default' ? { deviceId: { ideal: deviceId } } : {})
          }
        });
      } catch (err2) {
        console.warn('[AudioRecorder] All constraints failed, falling back to default mic:', err2);
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioCtx();

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.input = this.audioContext.createMediaStreamSource(this.mediaStream);

    // ═══════════════════════════════════════════════════════════════════════
    // SIRI-QUALITY VOICE PROCESSING PIPELINE
    // ═══════════════════════════════════════════════════════════════════════
    // The key insight: Siri uses hardware noise suppression + light gain +
    // a dynamics compressor to produce clean, consistent audio regardless
    // of how far the user is from the mic or how loud they speak.
    // ═══════════════════════════════════════════════════════════════════════

    // 1. Gentle Preamp Gain (1.8x) — just enough to lift quiet speech without
    //    amplifying noise. Previously 2.8x which was too aggressive and caused
    //    noise amplification and occasional clipping.
    this.preampGain = this.audioContext.createGain();
    this.preampGain.gain.setValueAtTime(1.8, this.audioContext.currentTime);

    // 2. High-pass filter at 85Hz — removes sub-bass rumble (AC hum, table bumps,
    //    traffic vibration) while preserving the deepest male vocal fundamentals (~85Hz).
    //    Q of 0.707 (Butterworth) gives a smooth rolloff without resonance.
    this.highpass = this.audioContext.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.setValueAtTime(85, this.audioContext.currentTime);
    this.highpass.Q.setValueAtTime(0.707, this.audioContext.currentTime);

    // 3. Low-pass filter at 8000Hz — removes high-frequency hiss, electronic noise,
    //    and ultrasonic artifacts that confuse speech recognition models.
    //    Human speech contains virtually no useful information above 8kHz.
    this.lowpass = this.audioContext.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.setValueAtTime(8000, this.audioContext.currentTime);
    this.lowpass.Q.setValueAtTime(0.707, this.audioContext.currentTime);

    // 4. Vocal presence boost — a peaking EQ at 2500Hz with moderate gain (+3dB)
    //    enhances speech intelligibility and consonant clarity (the "presence" range).
    //    This is the frequency range where 's', 't', 'k', 'p' sounds live,
    //    which are critical for accurate word recognition.
    this.vocalBand = this.audioContext.createBiquadFilter();
    this.vocalBand.type = 'peaking';
    this.vocalBand.frequency.setValueAtTime(2500, this.audioContext.currentTime);
    this.vocalBand.Q.setValueAtTime(1.0, this.audioContext.currentTime);
    this.vocalBand.gain.setValueAtTime(3, this.audioContext.currentTime);

    // 5. Dynamics Compressor — the SECRET WEAPON for Siri-quality audio.
    //    This ensures consistent volume regardless of:
    //    - User speaking softly vs shouting
    //    - User being close vs far from mic
    //    - Sudden loud sounds (laughs, coughs)
    //    Settings tuned for natural speech compression without "pumping" artifacts.
    this.dynamicsCompressor = this.audioContext.createDynamicsCompressor();
    this.dynamicsCompressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);  // Start compressing at -24dB
    this.dynamicsCompressor.knee.setValueAtTime(12, this.audioContext.currentTime);         // Soft knee for natural sound
    this.dynamicsCompressor.ratio.setValueAtTime(6, this.audioContext.currentTime);          // 6:1 ratio — moderate compression
    this.dynamicsCompressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);    // 3ms attack — catches transients
    this.dynamicsCompressor.release.setValueAtTime(0.15, this.audioContext.currentTime);     // 150ms release — smooth recovery

    // Buffer size 4096, 1 input channel, 1 output channel
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.audioBuffers = [];
    this.isRecording = true;

    // ═══════════════════════════════════════════════════════════════════════
    // SPLIT PIPELINE: VAD analysis BEFORE compressor, recording AFTER compressor
    // ═══════════════════════════════════════════════════════════════════════
    // The DynamicsCompressor boosts quiet signals (including silence) which
    // makes silence look like speech to the VAD. Solution: tap the signal
    // BEFORE the compressor for voice activity detection, but record the
    // post-compressor audio for better quality.
    // ═══════════════════════════════════════════════════════════════════════

    // VAD Analyser — connected BEFORE the compressor to get true speech/silence levels
    this.vadAnalyser = this.audioContext.createAnalyser();
    this.vadAnalyser.fftSize = 2048;
    this.vadAnalyser.smoothingTimeConstant = 0.3;

    // VAD ScriptProcessor — runs in parallel to measure pre-compressor RMS for VAD
    this.vadProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.vadRms = 0; // Stores the latest pre-compressor RMS
    this.vadMuteGain = this.audioContext.createGain();
    this.vadMuteGain.gain.setValueAtTime(0, this.audioContext.currentTime);

    this.vadProcessor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      let s = 0;
      for (let i = 0; i < data.length; i++) {
        s += data[i] * data[i];
      }
      this.vadRms = Math.sqrt(s / data.length);
    };

    // Connect the voice processing chain:
    // mic → preamp → highpass → lowpass → vocal boost ──┬──→ compressor → processor (recording)
    //                                                    └──→ vadAnalyser → vadProcessor (VAD)
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.highpass);
    this.highpass.connect(this.lowpass);
    this.lowpass.connect(this.vocalBand);

    // Recording path: vocal boost → compressor → processor
    this.vocalBand.connect(this.dynamicsCompressor);
    this.dynamicsCompressor.connect(this.processor);

    // VAD path: vocal boost → vadAnalyser → vadProcessor (silenced output)
    this.vocalBand.connect(this.vadAnalyser);
    this.vadAnalyser.connect(this.vadProcessor);
    this.vadProcessor.connect(this.vadMuteGain);
    this.vadMuteGain.connect(this.audioContext.destination);

    // Connect through a zero-gain mute node to destination so onaudioprocess ticks
    // without playing mic audio back into earbuds (avoids acoustic feedback & mic muting!)
    this.muteGain = this.audioContext.createGain();
    this.muteGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.processor.connect(this.muteGain);
    this.muteGain.connect(this.audioContext.destination);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording || this.isPaused) return;
      const channelData = e.inputBuffer.getChannelData(0);
      const chunk = new Float32Array(channelData);

      // Use the PRE-COMPRESSOR RMS for all VAD decisions!
      // This is the true signal level unaffected by the compressor's gain boosting.
      // The compressor boosts silence, making the post-compressor RMS unreliable for
      // detecting when the user has stopped speaking.
      const rms = this.vadRms || 0;

      // Post-compressor RMS just for the volume visualization (looks smoother)
      let postSum = 0;
      for (let i = 0; i < channelData.length; i++) {
        postSum += channelData[i] * channelData[i];
      }
      const postRms = Math.sqrt(postSum / channelData.length);
      const normalizedLevel = Math.min(1.0, postRms * 6.0 * this.sensitivityMultiplier);

      this.onVolumeCallbacks.forEach(cb => cb(normalizedLevel));

      // ═══════════════════════════════════════════════════════════════════
      // SPECTRAL VOICE ACTIVITY DETECTION (VAD)
      // ═══════════════════════════════════════════════════════════════════
      // Instead of just checking RMS level (which triggers on ANY sound —
      // keyboard clicks, fan noise, door slams), we also analyze the
      // frequency spectrum to confirm the sound is actually human speech.
      //
      // Human speech has most energy between 300Hz-3400Hz. Non-speech
      // sounds (clicks, hums, impacts) have very different spectral shapes.
      // ═══════════════════════════════════════════════════════════════════
      let isSpectrallyVoice = true;
      if (this.vadAnalyser) {
        const freqData = new Uint8Array(this.vadAnalyser.frequencyBinCount);
        this.vadAnalyser.getByteFrequencyData(freqData);

        const sampleRate = this.audioContext ? this.audioContext.sampleRate : 48000;
        const binHz = sampleRate / this.vadAnalyser.fftSize;

        // Calculate energy in voice band (300Hz-3400Hz) vs full spectrum
        let voiceBandEnergy = 0;
        let totalEnergy = 0;
        const voiceLowBin = Math.floor(300 / binHz);
        const voiceHighBin = Math.min(Math.ceil(3400 / binHz), freqData.length - 1);

        for (let i = 0; i < freqData.length; i++) {
          totalEnergy += freqData[i];
          if (i >= voiceLowBin && i <= voiceHighBin) {
            voiceBandEnergy += freqData[i];
          }
        }

        // Voice should have >35% of its energy in the voice band
        // Non-speech impacts/clicks are broadband and fail this check
        const voiceRatio = totalEnergy > 0 ? voiceBandEnergy / totalEnergy : 0;
        isSpectrallyVoice = voiceRatio > 0.30;
      }

      const sampleRate = this.audioContext ? this.audioContext.sampleRate : 48000;
      const chunkDurationMs = (channelData.length / sampleRate) * 1000;

      // Adaptively track ambient noise floor while idle (smooth exponential moving average)
      if (!this.isSpeaking) {
        this.noiseFloor = (this.noiseFloor * 0.97) + (rms * 0.03);
      }

      // Voice start threshold — requires BOTH sufficient RMS energy AND
      // spectral confirmation that the sound is speech-like
      const dynamicStartThreshold = Math.max(0.012, this.noiseFloor * 2.0);

      // Silence threshold during active speech
      const dynamicSilenceThreshold = Math.max(0.005, this.noiseFloor * 1.15);
      const isVoiceActive = rms >= dynamicSilenceThreshold;

      if (!this.isSpeaking) {
        // Keep a rolling pre-speech buffer so initial syllables are never clipped
        this.preBuffer.push(chunk);
        if (this.preBuffer.length > this.maxPreBufferChunks) {
          this.preBuffer.shift();
        }

        // Require RMS above threshold AND spectral voice confirmation
        if (rms >= dynamicStartThreshold && isSpectrallyVoice) {
          this.consecutiveSpeechFrames = (this.consecutiveSpeechFrames || 0) + 1;
          // Require at least 2 consecutive frames (~170ms) of sustained vocal energy
          // to filter out single-frame clicks while still catching speech promptly
          if (this.consecutiveSpeechFrames >= 2) {
            this.isSpeaking = true;
            this.hasUserSpoken = true;
            this.peakRms = rms;
            this.silenceAccumulatedMs = 0;
            this.consecutiveSpeechFrames = 0;
            this.audioBuffers = [...this.preBuffer, chunk];
            this.preBuffer = [];

            clearTimeout(this.maxSpeechTimer);
            this.maxSpeechTimer = setTimeout(() => this.triggerSpeechEnd(), 60000);

            if (this.onSpeechStartCb) this.onSpeechStartCb();
          }
        } else {
          this.consecutiveSpeechFrames = 0;
        }
      } else {
        // User is actively speaking
        this.audioBuffers.push(chunk);

        if (rms > (this.peakRms || 0)) {
          this.peakRms = rms;
        }

        if (isVoiceActive) {
          this.hasUserSpoken = true;
          this.silenceAccumulatedMs = 0;
          if (this.initialWaitTimer) {
            clearTimeout(this.initialWaitTimer);
            this.initialWaitTimer = null;
          }
        } else {
          // RMS is below silenceThreshold -> User paused or completed their sentence
          if (this.hasUserSpoken) {
            this.silenceAccumulatedMs = (this.silenceAccumulatedMs || 0) + chunkDurationMs;

            // Sentence completion: 900ms pause triggers instant answer (Siri/Google speed)
            // Fast, natural turn-taking without annoying 2-second lag!
            if (this.silenceAccumulatedMs >= 900) {
              console.log(`[AudioRecorder] Sentence complete! Natural pause detected (${Math.round(this.silenceAccumulatedMs)}ms). Processing speech...`);
              this.triggerSpeechEnd();
            }
          }
        }
      }
    };
  }

  triggerSpeechEnd() {
    if (!this.isSpeaking && this.audioBuffers.length === 0) return;
    this.isSpeaking = false;
    this.hasUserSpoken = false;
    const recordedPeak = this.peakRms;
    this.peakRms = 0;
    this.silenceAccumulatedMs = 0;
    clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
    clearTimeout(this.maxSpeechTimer);
    this.maxSpeechTimer = null;
    clearTimeout(this.initialWaitTimer);
    this.initialWaitTimer = null;
    this.consecutiveSpeechFrames = 0;

    const nativeSampleRate = this.audioContext ? this.audioContext.sampleRate : 48000;
    const totalSamples = this.audioBuffers.reduce((acc, b) => acc + b.length, 0);
    const durationMs = (totalSamples / nativeSampleRate) * 1000;

    // Only discard ultra-short blips (< 450ms) or absolute silence (< 0.008 peak)
    // Real speech sentences are always preserved and sent to STT
    if (durationMs < 300 || (recordedPeak && recordedPeak < 0.006)) {
      console.log(`[AudioRecorder] Discarding short audio burst (${Math.round(durationMs)}ms, peak RMS: ${recordedPeak?.toFixed(4)})`);
      this.audioBuffers = [];
      this.preBuffer = [];
      if (this.onNoSpeechCb) this.onNoSpeechCb();
      return;
    }

    const wavBase64 = this.exportWavBase64(this.audioBuffers, nativeSampleRate, this.targetSampleRate);
    this.audioBuffers = [];
    this.preBuffer = [];

    if (this.onSpeechEndCb) {
      this.onSpeechEndCb(wavBase64);
    }
  }

  async stop() {
    this.isRecording = false;
    this.isSpeaking = false;
    this.isContinuous = false;
    clearTimeout(this.silenceTimer);
    this.silenceTimer = null;

    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.vadProcessor) {
      try { this.vadProcessor.disconnect(); this.vadProcessor.onaudioprocess = null; } catch (e) {}
      this.vadProcessor = null;
    }
    if (this.vadMuteGain) {
      try { this.vadMuteGain.disconnect(); } catch (e) {}
      this.vadMuteGain = null;
    }
    if (this.vadAnalyser) {
      try { this.vadAnalyser.disconnect(); } catch (e) {}
      this.vadAnalyser = null;
    }
    if (this.dynamicsCompressor) {
      try { this.dynamicsCompressor.disconnect(); } catch (e) {}
      this.dynamicsCompressor = null;
    }
    if (this.vocalBand) {
      try { this.vocalBand.disconnect(); } catch (e) {}
      this.vocalBand = null;
    }
    if (this.lowpass) {
      try { this.lowpass.disconnect(); } catch (e) {}
      this.lowpass = null;
    }
    if (this.highpass) {
      try { this.highpass.disconnect(); } catch (e) {}
      this.highpass = null;
    }
    if (this.preampGain) {
      try { this.preampGain.disconnect(); } catch (e) {}
      this.preampGain = null;
    }
    if (this.input) {
      this.input.disconnect();
      this.input = null;
    }
    if (this.muteGain) {
      this.muteGain.disconnect();
      this.muteGain = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    const nativeSampleRate = this.audioContext ? this.audioContext.sampleRate : 48000;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    const wavBase64 = this.exportWavBase64(this.audioBuffers, nativeSampleRate, this.targetSampleRate);
    this.audioBuffers = [];
    this.preBuffer = [];
    return wavBase64;
  }

  exportWavBase64(buffers, sourceSampleRate, targetSampleRate = 16000) {
    if (!buffers || buffers.length === 0) return '';

    let totalLength = 0;
    for (const buf of buffers) {
      totalLength += buf.length;
    }
    if (totalLength === 0) return '';

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }

    // High quality sinc-interpolation resample to targetSampleRate (16000 Hz)
    let pcmData = merged;
    if (sourceSampleRate !== targetSampleRate) {
      pcmData = this.resampleBufferHQ(merged, sourceSampleRate, targetSampleRate);
    }

    // Soft-clip and normalize the final PCM to prevent any clipping artifacts
    // that would confuse the speech recognition model
    pcmData = this.softClipAndNormalize(pcmData);

    // Convert to 16-bit PCM WAV
    const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(wavBuffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true);
    this.writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    // "data" sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length * 2, true);

    // Write PCM audio samples
    let index = 44;
    for (let i = 0; i < pcmData.length; i++) {
      let sample = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      index += 2;
    }

    // Convert ArrayBuffer to Base64 in safe chunks
    let binary = '';
    const bytes = new Uint8Array(wavBuffer);
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  }

  /**
   * High-quality resampling using windowed sinc interpolation.
   * This produces dramatically better audio quality than simple linear interpolation,
   * especially for the 48kHz → 16kHz downsampling that speech recognition needs.
   *
   * Linear interpolation creates aliasing artifacts that sound like metallic ringing
   * and confuse ASR models. Sinc interpolation preserves the audio spectrum cleanly.
   */
  resampleBufferHQ(sourceBuffer, sourceSampleRate, targetSampleRate) {
    if (sourceSampleRate === targetSampleRate) return sourceBuffer;

    const ratio = sourceSampleRate / targetSampleRate;
    const targetLength = Math.round(sourceBuffer.length / ratio);
    const result = new Float32Array(targetLength);

    // Use a windowed sinc kernel with 6 taps on each side for quality
    const SINC_TAPS = 6;

    for (let i = 0; i < targetLength; i++) {
      const originIndex = i * ratio;
      const center = Math.floor(originIndex);
      const frac = originIndex - center;

      let sample = 0;
      let weightSum = 0;

      for (let j = -SINC_TAPS; j <= SINC_TAPS; j++) {
        const srcIdx = center + j;
        if (srcIdx < 0 || srcIdx >= sourceBuffer.length) continue;

        const x = frac - j;
        // sinc(x) * Hann window
        let sinc;
        if (Math.abs(x) < 1e-6) {
          sinc = 1.0;
        } else {
          sinc = Math.sin(Math.PI * x) / (Math.PI * x);
        }

        // Hann window
        const windowX = (j - frac + SINC_TAPS) / (2 * SINC_TAPS);
        const window = 0.5 * (1 - Math.cos(2 * Math.PI * windowX));

        const weight = sinc * window;
        sample += sourceBuffer[srcIdx] * weight;
        weightSum += weight;
      }

      result[i] = weightSum > 0 ? sample / weightSum : 0;
    }

    return result;
  }

  /**
   * Soft-clip and normalize audio to prevent clipping distortion.
   * Uses tanh soft-clipping which sounds natural even when audio is hot,
   * then normalizes to 85% full scale for optimal speech recognition input levels.
   */
  softClipAndNormalize(samples) {
    // Find peak
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }

    if (peak < 0.001) return samples; // Silence

    // Normalize to ~85% full scale (0.85) — leaves headroom and prevents
    // the speech recognition model from seeing clipped waveforms
    const targetPeak = 0.85;
    const gain = targetPeak / peak;
    // Cap amplification at 15x to avoid boosting pure noise
    const safeGain = Math.min(gain, 15.0);

    const result = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      let s = samples[i] * safeGain;
      // Soft-clip using tanh for any remaining peaks
      if (Math.abs(s) > 0.9) {
        s = Math.tanh(s);
      }
      result[i] = s;
    }

    return result;
  }

  // Legacy linear resample kept as fallback
  resampleBuffer(sourceBuffer, sourceSampleRate, targetSampleRate) {
    if (sourceSampleRate === targetSampleRate) return sourceBuffer;
    const ratio = sourceSampleRate / targetSampleRate;
    const targetLength = Math.round(sourceBuffer.length / ratio);
    const result = new Float32Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
      const originIndex = i * ratio;
      const indexFloor = Math.floor(originIndex);
      const indexCeil = Math.min(sourceBuffer.length - 1, Math.ceil(originIndex));
      const weight = originIndex - indexFloor;
      result[i] = sourceBuffer[indexFloor] * (1 - weight) + sourceBuffer[indexCeil] * weight;
    }
    return result;
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

window.AudioRecorder = AudioRecorder;
