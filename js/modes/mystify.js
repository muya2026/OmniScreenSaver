import { setup2D, drawName, smoothstep, random, TAU } from "./common.js";

export function createMode({ canvas, name, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#080416");
  const { ctx } = surface;
  let lastCycle = -1;
  let width = 1, height = 1;
  function resize(w, h, ratio) { surface.resize(w, h, ratio); width = w; height = h; }
  function frame(dt, time) {
    ctx.fillStyle = "rgba(7,5,20,.19)"; ctx.fillRect(0, 0, width, height);
    const cycle = time % 14;
    const reveal = showName ? smoothstep(4, 6.4, cycle) * (1 - smoothstep(9.8, 12, cycle)) : 0;
    const cx = width / 2, cy = height / 2;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 8; i++) {
      const phase = time * (.18 + i * .008) + i * TAU / 8;
      const radiusX = width * (.18 + .17 * (0.5 + .5 * Math.sin(phase * .67)));
      const radiusY = height * (.14 + .17 * (0.5 + .5 * Math.cos(phase * .53)));
      const hue = (265 + i * 21 + Math.sin(phase) * 28 + 360) % 360;
      ctx.strokeStyle = `hsla(${hue}, 96%, 68%, .34)`;
      ctx.lineWidth = 1.4 + (i % 3) * .7;
      ctx.shadowColor = `hsla(${hue}, 98%, 72%, .9)`; ctx.shadowBlur = 17;
      ctx.beginPath();
      for (let j = 0; j <= 150; j++) {
        const a = j / 150 * TAU;
        const wobble = 1 + .12 * Math.sin(a * (2 + i % 3) + phase * 1.3);
        const x = cx + Math.cos(a + phase * .22) * radiusX * wobble + Math.sin(a * 3 + phase) * width * .025;
        const y = cy + Math.sin(a - phase * .19) * radiusY * wobble + Math.cos(a * 2 + phase * .8) * height * .03;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
    if (showName && reveal > .02) {
      const glow = ctx.createLinearGradient(cx - width * .28, cy, cx + width * .28, cy);
      glow.addColorStop(0, "#ff82df"); glow.addColorStop(.5, "#d9b0ff"); glow.addColorStop(1, "#74f8ed");
      drawName(ctx, name, cx, cy, { maxWidth: width * .67, maxHeight: height * .2, size: 138, color: "rgba(13,8,31,.84)", stroke: glow, strokeWidth: 3.2, blur: 25, shadow: "#d677ff", alpha: reveal * .88 });
      drawName(ctx, name, cx, cy, { maxWidth: width * .67, maxHeight: height * .2, size: 138, color: glow, blur: 22, shadow: "#60ffe6", alpha: reveal * .26 });
    }
    ctx.globalCompositeOperation = "source-over";
    const current = Math.floor(time / 14);
    if (current !== lastCycle && cycle < .2) { lastCycle = current; emitSound("softChime"); }
  }
  return { resize, frame, destroy() {} };
}
