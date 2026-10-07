import { createAmbientScene } from "./sound-kit.js";

export class AudioEngine {
  constructor(onUnavailable = () => {}) {
    this.context = null;
    this.master = null;
    this.current = null;
    this.enabled = true;
    this.volume = .4;
    this.onUnavailable = onUnavailable;
    this.closeTimer = null;
  }

  startFromGesture() {
    if (this.closeTimer) { clearTimeout(this.closeTimer); this.closeTimer = null; }
    if (!this.context || this.context.state === "closed") {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) { this.onUnavailable(); return Promise.resolve(false); }
      try {
        this.context = new AudioContextClass({ latencyHint: "playback" });
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -25; compressor.knee.value = 20; compressor.ratio.value = 10; compressor.attack.value = .004; compressor.release.value = .24;
        this.master = this.context.createGain(); this.master.gain.value = 0;
        this.master.connect(compressor); compressor.connect(this.context.destination);
      } catch {
        this.context = null; this.master = null; this.onUnavailable(); return Promise.resolve(false);
      }
    }
    let resumePromise = Promise.resolve();
    try { if (this.context.state === "suspended") resumePromise = this.context.resume(); } catch { /* browser may keep audio suspended */ }
    this.#applyMaster(.18);
    return Promise.resolve(resumePromise).then(() => this.context?.state !== "closed").catch(() => false);
  }

  #applyMaster(seconds = .28) {
    if (!this.context || !this.master || this.context.state === "closed") return;
    const gain = this.enabled ? this.volume * .66 : 0;
    const parameter = this.master.gain;
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(gain, now, Math.max(.015, seconds / 3));
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.#applyMaster(.24);
  }

  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, Number(volume) || 0));
    this.#applyMaster(.18);
  }

  setScene(sceneId) {
    if (!this.context || !this.master || this.context.state === "closed") return;
    const previous = this.current;
    const next = createAmbientScene(sceneId, this.context, this.master);
    this.current = next;
    next.fadeTo(1, .9);
    if (previous) {
      previous.fadeTo(0, .9);
      setTimeout(() => previous.stop(), 950);
    }
  }

  trigger(eventName) {
    if (this.current && this.enabled) this.current.trigger(eventName);
  }

  stop() {
    const context = this.context;
    if (!context || context.state === "closed") { this.context = null; this.master = null; this.current = null; return; }
    this.#applyMaster(.32);
    if (this.master) {
      const now = context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, .08);
    }
    const current = this.current;
    this.current = null;
    if (current) { current.fadeTo(0, .22); setTimeout(() => current.stop(), 300); }
    this.closeTimer = setTimeout(() => {
      if (context === this.context) {
        try { context.close(); } catch { /* it may already be closed */ }
        this.context = null; this.master = null; this.closeTimer = null;
      }
    }, 420);
  }
}
