// Procedural Web Audio API sound synthesizer with Master, SFX, and UI volume channels

export interface AudioSettingsState {
  muted: boolean;
  masterVolume: number; // 0 to 100
  sfxVolume: number; // 0 to 100
  uiVolume: number; // 0 to 100
  musicAmbientVolume: number; // 0 to 100
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettingsState = {
  muted: false,
  masterVolume: 85,
  sfxVolume: 90,
  uiVolume: 80,
  musicAmbientVolume: 65
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGainScalar = 0.85;
  private sfxGainScalar = 0.9;
  private uiGainScalar = 0.8;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public applyAudioSettings(settings: AudioSettingsState): void {
    this.muted = settings.muted;
    this.masterGainScalar = Math.max(0, Math.min(1, settings.masterVolume / 100));
    this.sfxGainScalar = Math.max(0, Math.min(1, settings.sfxVolume / 100));
    this.uiGainScalar = Math.max(0, Math.min(1, settings.uiVolume / 100));
  }

  private getSfxScale(): number {
    return Math.max(0.001, this.masterGainScalar * this.sfxGainScalar);
  }

  private getUiScale(): number {
    return Math.max(0.001, this.masterGainScalar * this.uiGainScalar);
  }

  private randPitch(base: number, variance = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * variance);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = this.getSfxScale();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.randPitch(145), now);
    osc.frequency.exponentialRampToValueAtTime(this.randPitch(340), now + 0.14);
    gain.gain.setValueAtTime(0.18 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playDodge(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = this.getSfxScale();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(this.randPitch(220), now);
    osc.frequency.exponentialRampToValueAtTime(this.randPitch(95), now + 0.22);
    gain.gain.setValueAtTime(0.2 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playBallHit(heavy: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = this.getSfxScale();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'sine';
    const startFreq = heavy ? this.randPitch(180) : this.randPitch(120);
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + (heavy ? 0.28 : 0.15));
    gain.gain.setValueAtTime((heavy ? 0.32 : 0.16) * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.3 : 0.16));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (heavy ? 0.3 : 0.16));
  }

  public playBoostPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = this.getSfxScale();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.randPitch(520, 0.05), now);
    osc.frequency.exponentialRampToValueAtTime(this.randPitch(880, 0.05), now + 0.15);
    gain.gain.setValueAtTime(0.14 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playGoalExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = this.getSfxScale();
    const now = ctx.currentTime;
    [220, 277.18, 329.63, 440].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.04, now + 0.75);
      gain.gain.setValueAtTime(0.11 * scale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    });
  }

  public playDemolitionExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = this.getSfxScale();
    const now = ctx.currentTime;
    [160, 110, 75].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(this.randPitch(freq, 0.1), now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
      gain.gain.setValueAtTime((0.24 / (idx + 1)) * scale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
    });
  }

  public playUiConfirm(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = this.getUiScale();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.09);
    gain.gain.setValueAtTime(0.1 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export const soundEngine = new SoundEngine();
