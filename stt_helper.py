import os
import sys
import wave
import numpy as np
import speech_recognition as sr

def clean_and_normalize_audio(file_path):
    """
    Cleans audio using gentle DC offset removal and smooth peak normalization
    to deliver crystal-clear, un-distorted audio to speech recognition.
    """
    try:
        with wave.open(file_path, 'rb') as wf:
            params = wf.getparams()
            raw_data = wf.readframes(wf.getnframes())

        if params.sampwidth != 2 or len(raw_data) < 1600:
            return file_path

        samples = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32)

        # 1. Remove DC offset
        samples = samples - np.mean(samples)

        # 2. Apply a gentle high-pass filter at 80Hz to remove rumble
        # Simple first-order IIR high-pass
        if params.framerate > 0:
            rc = 1.0 / (2.0 * np.pi * 80.0)
            dt = 1.0 / params.framerate
            alpha = rc / (rc + dt)
            filtered = np.zeros_like(samples)
            filtered[0] = samples[0]
            for i in range(1, len(samples)):
                filtered[i] = alpha * (filtered[i - 1] + samples[i] - samples[i - 1])
            samples = filtered

        # 3. Smooth peak normalization to 80% full scale (26000 / 32767)
        peak = np.max(np.abs(samples))
        if peak > 80:  # If not absolute silence
            norm_factor = 26000.0 / peak
            # Cap maximum amplification to 15x to prevent over-amplifying faint ambient room hiss
            norm_factor = min(norm_factor, 15.0)
            samples = samples * norm_factor

        cleaned_int16 = np.clip(samples, -32768, 32767).astype(np.int16)

        cleaned_path = file_path.replace(".wav", "_clean.wav")
        with wave.open(cleaned_path, 'wb') as wf:
            wf.setparams(params)
            wf.writeframes(cleaned_int16.tobytes())

        return cleaned_path
    except Exception as e:
        sys.stderr.write(f"Audio cleanup warning: {e}\n")
        return file_path

def transcribe_wav(file_path):
    target_file = clean_and_normalize_audio(file_path)
    if not target_file:
        return ""

    r = sr.Recognizer()
    r.dynamic_energy_threshold = True   # Let recognizer adapt to ambient noise
    r.energy_threshold = 300            # Standard threshold for clean audio
    r.pause_threshold = 1.5
    r.phrase_threshold = 0.3            # Minimum seconds of speech to consider
    r.non_speaking_duration = 0.5       # Seconds of non-speaking before phrase end

    try:
        with sr.AudioFile(target_file) as source:
            # Adjust for ambient noise in the first 0.5 seconds
            r.adjust_for_ambient_noise(source, duration=0.3)
            audio_data = r.record(source)
            # Try Google Speech Recognition with language hint
            text = r.recognize_google(audio_data, language="en-IN", show_all=False)
            return text
    except sr.UnknownValueError:
        return ""
    except Exception as e:
        sys.stderr.write(f"STT Error: {str(e)}\n")
        return ""
    finally:
        if target_file != file_path and os.path.exists(target_file):
            try:
                os.remove(target_file)
            except Exception:
                pass

if __name__ == "__main__":
    if len(sys.argv) > 1:
        result = transcribe_wav(sys.argv[1])
        print(result)
    else:
        print("Usage: python stt_helper.py <audio_file.wav>")
