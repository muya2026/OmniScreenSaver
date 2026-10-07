import { setup2D, random, TAU, drawName, smoothstep, drawGlowDot } from "./common.js";
import { scaledNameTargets } from "../name-shape.js";

export function createMode({ canvas, name, shape, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#140817");
  const { ctx } = surface;
  let width = 1, height = 1, blobs = [], targets = [], lastBubble = 0;
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    blobs = Array.from({ length: 11 }, (_, index) => ({ x: random(.1, .9), y: random(.18, .78), rx: random(.045, .12), ry: random(.07, .18), phase: random(0, TAU), hue: [18, 28, 342, 8][index % 4] }));
    targets = showName ? scaledNameTargets(shape, w, h, 90, .5, .18) : [];
  }
  function frame(dt, time) {
    const bg = ctx.createLinearGradient(0, 0, width, height); bg.addColorStop(0, "#10091c"); bg.addColorStop(.5, "#2a1024"); bg.addColorStop(1, "#100a1b"); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    const phase = time % 18;
    const gather = showName ? smoothstep(5, 7.5, phase) * (1 - smoothstep(12, 15, phase)) : 0;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const blob of blobs) {
      const driftX = Math.sin(time * (.14 + blob.rx) + blob.phase) * width * .15;
      const driftY = Math.cos(time * .12 + blob.phase) * height * .12;
      let x = blob.x * width + driftX, y = blob.y * height + driftY;
      if (gather > 0 && targets.length) {
        const target = targets[Math.floor((blob.phase * 17 + time * 4) % targets.length)];
        x = x * (1 - gather) + target.x * gather; y = y * (1 - gather) + target.y * gather;
      }
      const radius = Math.min(width, height) * (blob.rx + .045 * (Math.sin(time * .32 + blob.phase) + 1) / 2);
      const gradient = ctx.createRadialGradient(x - radius * .23, y - radius * .29, radius * .04, x, y, radius);
      gradient.addColorStop(0, `hsla(${blob.hue + 16},100%,76%,.58)`); gradient.addColorStop(.32, `hsla(${blob.hue},96%,53%,.35)`); gradient.addColorStop(1, `hsla(${blob.hue - 8},92%,38%,0)`);
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.ellipse(x, y, radius * 1.12, radius * (1.1 + .2 * Math.sin(time * .21 + blob.phase)), time * .04 + blob.phase, 0, TAU); ctx.fill();
      ctx.strokeStyle = `hsla(${blob.hue + 15},100%,77%,.13)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, radius * .7, radius * .78, time * .04, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    if (showName && gather > .05) {
      for (let i = 0; i < targets.length; i += 3) {
        const target = targets[i];
        ctx.globalAlpha = gather * (.28 + .25 * (Math.sin(time * 2 + i) + 1) / 2);
        drawGlowDot(ctx, target.x, target.y, 2.5, "#ffb34f", 12);
      }
      ctx.globalAlpha = 1;
      drawName(ctx, name, width / 2, height / 2, { maxWidth: width * .5, maxHeight: height * .16, size: 102, color: "rgba(255,219,157,.58)", shadow: "#ff7438", blur: 24, alpha: gather * .7 });
    }
    const bubble = Math.floor(time / 3.5);
    if (bubble !== lastBubble) { lastBubble = bubble; emitSound("bubble"); }
  }
  return { resize, frame, destroy() {} };
}
