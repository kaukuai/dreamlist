#!/usr/bin/env python3
"""Reproduce Dreamlist's original instrumental loops (authoring only: numpy + ffmpeg).

No samples, recordings, external melodies or model-generated music are used.
Tails wrap into the opening, so decoded AudioBuffer loops have no silent boundary.
"""
from pathlib import Path
import json
import subprocess
import tempfile
import wave
import numpy as np

RATE = 32000
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "audio"
OUTPUT.mkdir(parents=True, exist_ok=True)


def compose(name, tempo, combat=False):
    beat = 60 / tempo
    duration = beat * 64
    total = round(duration * RATE)
    mix = np.zeros((total, 2), dtype=np.float64)
    rng = np.random.default_rng(4472 if combat else 1789)

    def add(signal, start, gain=1, pan=0):
        indices = (np.arange(len(signal)) + round(start * RATE)) % total
        mix[indices, 0] += signal * gain * np.sqrt((1 - pan) / 2)
        mix[indices, 1] += signal * gain * np.sqrt((1 + pan) / 2)

    def note(midi, start, length, gain, instrument="harp", pan=0):
        freq = 440 * 2 ** ((midi - 69) / 12)
        t = np.arange(round((length + 2.5) * RATE)) / RATE
        if instrument == "pad":
            envelope = np.minimum(1, t / 1.1) * np.minimum(1, np.maximum(0, length + 2.5 - t) / 2.5)
            signal = sum(np.sin(2 * np.pi * freq * ratio * t + .6 * np.sin(t * .9)) / harmonic
                         for ratio, harmonic in [(1, 1), (2.001, 5), (.999, 3), (3, 12)]) * envelope * .22
        elif instrument == "flute":
            envelope = (1 - np.exp(-t * 14)) * np.exp(-t / max(.1, length * .9))
            signal = (np.sin(2 * np.pi * freq * t + .035 * np.sin(t * 30)) + .14 * np.sin(4 * np.pi * freq * t)) * envelope * .52
        else:
            envelope = (1 - np.exp(-t * 360)) * np.exp(-t / (1.1 if instrument == "harp" else .5))
            signal = sum(np.sin(2 * np.pi * freq * harmonic * t) * np.exp(-t * harmonic * .45) / harmonic ** 1.8 for harmonic in range(1, 7)) * envelope * .65
        signal *= np.clip((length + 2.5 - t) / .12, 0, 1)
        add(signal, start, gain, pan)
        # Early reflections with opposing pans produce space without burying attacks.
        for delay, amount in [(.19, .19), (.37, .13), (.61, .08)]:
            add(signal, start + delay, gain * amount, -pan * .7)

    # Original A-Dorian progression, four variations of the same eight-bar phrase.
    chords = [[45, 52, 57, 60, 64], [43, 50, 55, 59, 62], [48, 55, 60, 64, 67], [50, 57, 62, 66, 69]]
    melody = [76, None, 74, 72, 71, None, 67, 69, 72, 74, None, 71, 69, None, 67, 64]
    for bar in range(16):
        chord = chords[(bar // 2) % 4]
        for pitch in chord:
            note(pitch, bar * 4 * beat, 4 * beat, .15 if combat else .23, "pad", (pitch % 3 - 1) * .3)
        for eighth in range(8):
            pitch = chord[1 + (eighth + bar) % 4] + (12 if eighth % 4 == 2 else 0)
            note(pitch, (bar * 4 + eighth / 2) * beat, beat, .10 if combat else .08, "harp", (-1 if eighth % 2 else 1) * .38)
        note(chord[0] - (12 if combat else 0), bar * 4 * beat, beat * 3, .25 if combat else .14, "bass")
        if combat:
            for pulse in [0, 1.5, 2, 3.5]:
                t = np.arange(round(.32 * RATE)) / RATE
                phase = 2 * np.pi * (54 * t + 32 * .035 * (1 - np.exp(-t / .035)))
                drum = np.sin(phase) * np.exp(-t * 15) + rng.normal(0, .045, len(t)) * np.exp(-t * 36)
                add(drum, (bar * 4 + pulse) * beat, .15)
            for pulse in [1, 3]:
                t = np.arange(round(.22 * RATE)) / RATE
                drum = (np.sin(2 * np.pi * 174 * t) * .4 + rng.normal(0, .1, len(t))) * np.exp(-t * 24)
                add(drum, (bar * 4 + pulse) * beat, .12, .2)
        if bar % 2 == 0:
            phrase = bar // 2
            for step in range(4):
                pitch = melody[(phrase * 3 + step) % len(melody)]
                if pitch is not None:
                    note(pitch + (0 if phrase < 4 else -12), (bar * 4 + step * 1.5) * beat, beat * 1.8, .15 if combat else .18, "flute", -.15)
    # Circular, short diffuse reflections. Constant-power crossfades happen at runtime.
    dry = mix.copy()
    for delay, gain in [(.071, .12), (.113, .09), (.173, .06)]:
        mix += np.roll(dry[:, ::-1], round(delay * RATE), axis=0) * gain
    mix = np.tanh(mix * 1.2)
    mix *= .76 / max(.01, np.abs(mix).max())
    with tempfile.TemporaryDirectory(prefix="dreamlist-score-") as folder:
        wav = Path(folder) / "score.wav"
        with wave.open(str(wav), "wb") as file:
            file.setnchannels(2);file.setsampwidth(2);file.setframerate(RATE)
            file.writeframes((mix * 32767).astype("<i2").tobytes())
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "112k", "-write_xing", "1", str(OUTPUT / (name + ".mp3"))], check=True)
    return {"file": name + ".mp3", "tempo": tempo, "duration": duration, "peak": float(np.abs(mix).max()), "rms": float(np.sqrt(np.mean(mix ** 2))), "bytes": (OUTPUT / (name + ".mp3")).stat().st_size}


if __name__ == "__main__":
    tracks = [compose("morningbell-town", 80), compose("echo-trial", 108, True)]
    manifest = {"created": "2026-10-28", "authorship": "Original Dreamlist procedural composition; no third-party recordings, samples or melodies.", "source": "scripts/compose-soundtrack.py", "instruments": ["synthesized plucked strings", "breathy sine flute", "soft harmonic pads", "synthesized frame drums"], "tracks": tracks}
    (OUTPUT / "credits.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest))
