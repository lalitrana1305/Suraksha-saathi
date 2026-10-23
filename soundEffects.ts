import { getStoredSettings } from './storage';

class AudioService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playBeep(frequency = 440, duration = 0.12, type: OscillatorType = 'sine', gainVal = 0.08): void {
    const settings = getStoredSettings();
    if (!settings.soundEnabled) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio might be blocked before user gesture; gracefully ignore
    }
  }

  playStartAlert(): void {
    this.playBeep(523.25, 0.1, 'sine', 0.08); // C5
    setTimeout(() => this.playBeep(659.25, 0.14, 'sine', 0.08), 110); // E5
  }

  playPause(): void {
    this.playBeep(440, 0.08, 'sine', 0.05);
  }

  playBottleneckWarning(): void {
    this.playBeep(330, 0.12, 'sawtooth', 0.06);
    setTimeout(() => this.playBeep(293.66, 0.15, 'sawtooth', 0.06), 130);
  }

  playSuccessComplete(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playBeep(freq, 0.18, 'triangle', 0.07), idx * 100);
    });
  }

  playRoadToggled(): void {
    this.playBeep(700, 0.06, 'sine', 0.05);
  }

  playEmergencySiren(): void {
    // Two-tone emergency siren sound
    this.playBeep(659.25, 0.22, 'sawtooth', 0.08); // E5
    setTimeout(() => this.playBeep(440, 0.28, 'sawtooth', 0.08), 240); // A4
    setTimeout(() => this.playBeep(659.25, 0.22, 'sawtooth', 0.07), 540);
    setTimeout(() => this.playBeep(440, 0.28, 'sawtooth', 0.07), 780);
  }

  playDispatchChime(): void {
    this.playBeep(440, 0.08, 'triangle', 0.08);
    setTimeout(() => this.playBeep(554.37, 0.08, 'triangle', 0.08), 90);
    setTimeout(() => this.playBeep(659.25, 0.15, 'triangle', 0.09), 180);
  }

  playSosAlert(): void {
    // 3 short, 3 long, 3 short Morse-like tone
    const beep = (f: number, d: number, t: number) => {
      setTimeout(() => this.playBeep(f, d, 'square', 0.06), t);
    };
    beep(880, 0.08, 0);
    beep(880, 0.08, 120);
    beep(880, 0.08, 240);
    beep(880, 0.18, 400);
    beep(880, 0.18, 620);
    beep(880, 0.18, 840);
    beep(880, 0.08, 1060);
    beep(880, 0.08, 1180);
    beep(880, 0.08, 1300);
  }
}

export const soundEffects = new AudioService();
