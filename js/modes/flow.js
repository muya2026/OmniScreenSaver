import { setup2D, random, TAU, clamp, drawName, smoothstep } from "./common.js";

export function createMode({ canvas, name, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#06101d");
  const { ctx } = surface;
  let width = 1, height = 1, particles = [], lastCue = 0;
  function createParticle() { return { x: random(0, width), y: random(0, height), px: 0, py: 0, age: random(0, 7), hue: random(175, 245), speed: random(35, 95) }; }
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    particles = Array.from({ length: Math.min(700, Math.floor(w * h / 2800)) }, createParticle);
  }
  function frame(dt, time) {
    ctx.fillStyle = "rgba(4,11,22,.16)"; ctx.fillRect(0, 0, width, height);
    const phase = time % 15;
    const reveal = showName ? smoothstep(5, 7, phase) * (1 - smoothstep(11, 13.4, phase)) : 0;
    if (showName && reveal > .04) {
      const glow = ctx.createLinearGradient(width * .2, height * .5, width * .8, height * .5); glow.addColorStop(0, "rgba(35,194,222,.1)"); glow.addColorStop(.5, `rgba(199,178,255,${.08 + reveal * .11})`); glow.addColorStop(1, "rgba(78,241,207,.12)");
      drawName(ctx, name, width / 2, height / 2, { maxWidth: width * .7, maxHeight: height * .23, size: 134, color: glow, shadow: "#59cfff", blur: 25, alpha: reveal });
    }
    for (const particle of particles) {
      particle.px = particle.x; particle.py = particle.y;
      const angle = Math.sin(particle.y * .0042 + time * .27) * 2.5 + Math.cos(particle.x * .0031 - time * .23) * 2.2 + Math.sin((particle.x + particle.y) * .0014 + time * .18) * 1.6;
      particle.x += Math.cos(angle) * particle.speed * dt;
      particle.y += Math.sin(angle) * particle.speed * dt;
      particle.age += dt;
      if (particle.x < -25 || particle.x > width + 25 || particle.y < -25 || particle.y > height + 25 || particle.age > 11) Object.assign(particle, createParticle());
      const nearName = reveal > .1 && Math.abs(particle.x - width / 2) < width * .35 && Math.abs(particle.y - height / 2) < height * .14;
      ctx.strokeStyle = nearName ? `hsla(${particle.hue + 20},100%,80%,.45)` : `hsla(${particle.hue},80%,70%,.2)`;
      ctx.lineWidth = nearName ? 1.5 : .8;
      ctx.beginPath(); ctx.moveTo(particle.px, particle.py); ctx.lineTo(particle.x, particle.y); ctx.stroke();
    }
    const cue = Math.floor(time / 7);
    if (cue !== lastCue) { lastCue = cue; emitSound("windChime"); }
  }
  return { resize, frame, destroy() {} };
}
