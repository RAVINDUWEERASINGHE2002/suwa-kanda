/**
 * Web Audio API synthesizer for Suwa Kanda Kitchen and POS chimes.
 * No external audio files needed; generates harmonic pleasant tones.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.unlocked = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.unlocked = true;
      }).catch(() => {});
    } else if (this.ctx && this.ctx.state === 'running') {
      this.unlocked = true;
    }
    return this.ctx;
  }

  // Mobile/desktop audio unlock trigger
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume().then(() => {
        this.unlocked = true;
        return true;
      });
    }
    this.unlocked = true;
    return Promise.resolve(true);
  }

  // Device vibration helper for mobile devices
  vibrate(pattern = [250, 100, 250, 100, 350]) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Ignore vibration errors
    }
  }

  // Loud penetrating kitchen alert when a new order is billed by cashier
  playKitchenChime() {
    this.vibrate([300, 150, 300, 150, 500]);
    if (this.muted) return;

    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Stage 1 Bell: E5 (659.25 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Stage 2 Bell: A5 (880.00 Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.12);
      gain2.gain.setValueAtTime(0.5, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);

      // Stage 3 High Chime: E6 (1318.51 Hz) - cuts through kitchen sounds
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1318.51, now + 0.28);
      gain3.gain.setValueAtTime(0.55, now + 0.28);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now + 0.28);
      osc3.stop(now + 1.1);

    } catch (err) {
      console.warn('Audio chime notice:', err);
    }
  }

  // Warm chime when kitchen staff taps "භාරගන්න (Accept Order)"
  playAccept() {
    this.vibrate([100]);
    if (this.muted) return;

    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (err) {
      console.warn('Audio notice:', err);
    }
  }

  // Satisfying bright success chime when kitchen staff taps the Tick (✔) Complete button
  playTickComplete() {
    this.vibrate([150, 80, 200]);
    if (this.muted) return;

    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Note 1: G5 (783.99 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: C6 (1046.50 Hz) - bright resolution
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now + 0.12);
      gain2.gain.setValueAtTime(0.45, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.85);

    } catch (err) {
      console.warn('Audio notice:', err);
    }
  }

  // POS Order Placed Tone
  playOrderPlaced() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (err) {
      console.warn('Audio notice:', err);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const soundManager = new SoundEffects();

// Auto unlock audio on first touch/click anywhere on page
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    soundManager.unlock();
    window.removeEventListener('click', handleInteraction);
    window.removeEventListener('touchstart', handleInteraction);
  };
  window.addEventListener('click', handleInteraction, { once: true });
  window.addEventListener('touchstart', handleInteraction, { once: true });
}

export default soundManager;
