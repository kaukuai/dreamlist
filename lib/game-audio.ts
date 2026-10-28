export type SoundSettings = {enabled: boolean; music: number; effects: number; ambience: number};
export type SoundCue = "step" | "interact" | "echo" | "low" | "high" | "mid" | "hit" | "swing" | "hurt" | "dash" | "warning" | "heal" | "win" | "reward" | "level";
export type SoundMood = "town" | "battle" | "dialogue";
export const defaultSound: SoundSettings = {enabled: false, music: .38, effects: .62, ambience: .3};
export const SOUND_KEY = "dreamlist:sound:v1";
export function readSoundSettings(storage: Pick<Storage, "getItem">): SoundSettings {
  try {
    const value = JSON.parse(storage.getItem(SOUND_KEY) ?? "null");
    const volume = (key: "music" | "effects" | "ambience") => typeof value?.[key] === "number" && Number.isFinite(value[key]) ? Math.max(0, Math.min(1, value[key])) : defaultSound[key];
    return {enabled: value?.enabled === true, music: volume("music"), effects: volume("effects"), ambience: volume("ambience")};
  } catch {return {...defaultSound};}
}

/** All sounds are created after opt-in and a real user gesture. No third-party audio. */
export class GameAudio {
  context: AudioContext | null = null;
  settings = {...defaultSound};
  mood: SoundMood = "town";
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private voices = new Map<string, {source: AudioBufferSourceNode; gain: GainNode}>();
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private noise: AudioBuffer | null = null;
  private generation = 0;
  private lastStep = 0;
  private onError: (message: string) => void;
  constructor(onError: (message: string) => void) {this.onError = onError;}
  async unlock(settings: SoundSettings) {
    this.settings = settings;
    if (!this.context) {
      const Constructor = window.AudioContext ?? (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
      if (!Constructor) throw new Error("這個瀏覽器暫不支援遊戲音訊");
      const context = new Constructor();this.context = context;
      const limiter = context.createDynamicsCompressor();limiter.threshold.value = -8;limiter.ratio.value = 8;limiter.connect(context.destination);
      this.musicGain = context.createGain();this.musicGain.connect(limiter);
      this.effectsGain = context.createGain();this.effectsGain.connect(limiter);
      this.ambienceGain = context.createGain();this.ambienceGain.connect(limiter);
      // A deterministic, soft air bed, not a repeating external recording.
      this.noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const channel = this.noise.getChannelData(0);let seed = 9631;
      for (let index = 0; index < channel.length; index++) {seed = (Math.imul(seed, 1664525) + 1013904223) | 0;channel[index] = (seed / 2147483648) * .16;}
      const wind = context.createBufferSource();wind.buffer = this.noise;wind.loop = true;
      const filter = context.createBiquadFilter();filter.type = "lowpass";filter.frequency.value = 480;wind.connect(filter);filter.connect(this.ambienceGain);wind.start();
    }
    await this.context.resume();this.apply(settings);await this.setMood(this.mood);
  }
  apply(settings: SoundSettings) {
    this.settings = settings;
    const context = this.context;if (!context) return;
    const volume = settings.enabled ? 1 : 0;
    this.musicGain?.gain.setTargetAtTime(settings.music * volume * (this.mood === "dialogue" ? .5 : .8), context.currentTime, .12);
    this.effectsGain?.gain.setTargetAtTime(settings.effects * volume * .48, context.currentTime, .08);
    this.ambienceGain?.gain.setTargetAtTime(settings.ambience * volume * (this.mood === "battle" ? .16 : .36), context.currentTime, .3);
  }
  async setMood(mood: SoundMood) {
    this.mood = mood;this.apply(this.settings);
    const context = this.context;if (!context || !this.settings.enabled) return;
    const name = mood === "battle" ? "echo-trial" : "morningbell-town";
    const version = ++this.generation;
    try {
      if (!this.buffers.has(name)) this.buffers.set(name, fetch(`/audio/${name}.mp3`).then(response => {if (!response.ok) throw new Error();return response.arrayBuffer();}).then(buffer => context.decodeAudioData(buffer)));
      const buffer = await this.buffers.get(name)!;
      if (version !== this.generation || !this.settings.enabled || context.state === "closed") return;
      for (const [key, voice] of this.voices) voice.gain.gain.setTargetAtTime(key === name ? 1 : 0, context.currentTime, .4);
      if (!this.voices.has(name)) {
        const source = context.createBufferSource();source.buffer = buffer;source.loop = true;
        const gain = context.createGain();gain.gain.value = 0;source.connect(gain);gain.connect(this.musicGain!);source.start();gain.gain.setTargetAtTime(1, context.currentTime, .4);
        this.voices.set(name, {source, gain});
      }
    } catch {this.buffers.delete(name);this.onError("配樂暫時無法載入；可以繼續遊玩，或稍後重新開啟聲音。");}
  }
  async suspend() {if (this.context?.state === "running") await this.context.suspend();}
  cue(kind: SoundCue) {
    const context = this.context;
    if (!context || !this.settings.enabled || context.state !== "running" || !this.effectsGain) return;
    const time = context.currentTime;
    if (kind === "step" && time - this.lastStep < .3) return;
    if (kind === "step") this.lastStep = time;
    const tone = (frequency: number, offset: number, duration: number, amplitude: number, type: OscillatorType = "sine") => {
      const source = context.createOscillator(), envelope = context.createGain();source.type = type;source.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, time + offset);envelope.gain.linearRampToValueAtTime(amplitude, time + offset + .008);envelope.gain.exponentialRampToValueAtTime(.0001, time + offset + duration);
      source.connect(envelope);envelope.connect(this.effectsGain!);source.start(time + offset);source.stop(time + offset + duration + .02);
    };
    const noise = (duration: number, amplitude: number, frequency: number) => {
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();source.buffer = this.noise;
      filter.type = "bandpass";filter.frequency.value = frequency;filter.Q.value = .8;
      envelope.gain.setValueAtTime(amplitude, time);envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
      source.connect(filter);filter.connect(envelope);envelope.connect(this.effectsGain!);source.start();source.stop(time + duration);
    };
    if (kind === "step") {noise(.08, .24, 620);tone(98, 0, .07, .06);}
    else if (kind === "swing" || kind === "dash") noise(kind === "dash" ? .26 : .14, .9, kind === "dash" ? 1200 : 1800);
    else if (kind === "hit") {noise(.12, 1.2, 900);tone(145, 0, .12, .28, "triangle");tone(440, .01, .12, .08);}
    else if (kind === "hurt") {tone(108, 0, .24, .3, "triangle");noise(.2, .5, 430);}
    else if (kind === "warning") {tone(392, 0, .19, .2);tone(523.25, .18, .25, .18);}
    else if (kind === "low" || kind === "mid" || kind === "high") {
      const frequency = kind === "low" ? 261.63 : kind === "mid" ? 329.63 : 392;tone(frequency, 0, 1.5, .38);tone(frequency * 2.002, 0, .8, .08);
    } else {
      const pitches = kind === "win" || kind === "level" ? [523.25, 659.25, 783.99, 1046.5] : kind === "heal" ? [440, 659.25] : kind === "echo" ? [659.25, 987.77, 1318.5] : kind === "reward" ? [523.25, 783.99] : [659.25];
      pitches.forEach((frequency, index) => tone(frequency, index * .11, .65, kind === "interact" ? .12 : .22));
    }
  }
  async close() {this.generation++;if (this.context?.state !== "closed") await this.context?.close();}
}
