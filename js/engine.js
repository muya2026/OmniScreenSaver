export class AnimationEngine {
  constructor({ host, mode, modeId, name, shape, language, settings, emitSound, onFrame = () => {}, onError = () => {} }) {
    this.host = host;
    this.modeInfo = mode;
    this.modeId = modeId;
    this.settings = settings;
    this.onFrame = onFrame;
    this.onError = onError;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "animation-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    this.host.replaceChildren(this.canvas);
    this.renderer = mode.create({
      canvas: this.canvas,
      name,
      shape,
      language,
      showName: settings.showName,
      emitSound: eventName => emitSound?.(eventName)
    });
    this.running = true;
    this.hidden = document.hidden;
    this.raf = 0;
    this.lastTime = 0;
    this.elapsed = 0;
    this.lastVisibility = this.hidden;
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    window.addEventListener("resize", this.resize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.resize();
    if (!this.hidden) this.raf = requestAnimationFrame(this.tick);
  }

  resize() {
    if (!this.running || !this.renderer?.resize) return;
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.renderer.resize(window.innerWidth, window.innerHeight, ratio);
  }

  tick(timestamp) {
    if (!this.running || this.hidden) return;
    const current = timestamp / 1000;
    const dt = this.lastTime ? Math.min(.05, Math.max(0, current - this.lastTime)) : 1 / 60;
    this.lastTime = current;
    const scaledDt = dt * (this.settings.speed || 1);
    this.elapsed += scaledDt;
    try {
      this.renderer.frame(scaledDt, this.elapsed);
      this.onFrame(dt, this.elapsed, scaledDt);
    } catch (error) {
      this.onError(error);
      this.destroy();
      return;
    }
    if (this.running && !this.hidden) this.raf = requestAnimationFrame(this.tick);
  }

  handleVisibility() {
    const nowHidden = document.hidden;
    if (nowHidden === this.hidden) return;
    this.hidden = nowHidden;
    this.lastTime = 0;
    if (this.hidden) cancelAnimationFrame(this.raf);
    else if (this.running) this.raf = requestAnimationFrame(this.tick);
  }

  setSpeed(speed) {
    this.settings.speed = Math.max(.5, Math.min(1.5, Number(speed) || 1));
  }

  destroy() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    try { this.renderer?.destroy?.(); } catch { /* renderer cleanup is best-effort */ }
    this.renderer = null;
    this.host.replaceChildren();
  }
}
