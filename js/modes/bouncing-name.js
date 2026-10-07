import { setup2D, fontSizeToFit, DISPLAY_FONT, drawName, random, clamp } from "./common.js";

export function createMode({ canvas, name, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#090d1d");
  const { ctx } = surface;
  let width = 1, height = 1, x = 0, y = 0, vx = 180, vy = 115, hue = 265;
  let lastSound = 0;
  function label() { return showName ? name : "✦"; }
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    x = clamp(x || w / 2, w * .2, w * .8); y = clamp(y || h / 2, h * .2, h * .8);
  }
  function frame(dt, time) {
    const text = label();
    const fontSize = fontSizeToFit(ctx, text, width * .72, Math.min(180, height * .26), 150, 28, DISPLAY_FONT, 700);
    ctx.font = `700 ${fontSize}px ${DISPLAY_FONT}`;
    const textW = Math.min(width * .72, ctx.measureText(text).width);
    const textH = fontSize * 1.18;
    const radiusX = textW / 2 + Math.max(24, fontSize * .22), radiusY = textH / 2 + Math.max(23, fontSize * .25);
    let hitX = false, hitY = false;
    x += vx * dt; y += vy * dt;
    if (x < radiusX) { x = radiusX; vx = Math.abs(vx); hitX = true; }
    if (x > width - radiusX) { x = width - radiusX; vx = -Math.abs(vx); hitX = true; }
    if (y < radiusY) { y = radiusY; vy = Math.abs(vy); hitY = true; }
    if (y > height - radiusY) { y = height - radiusY; vy = -Math.abs(vy); hitY = true; }
    const bg = ctx.createLinearGradient(0, 0, width, height); bg.addColorStop(0, "#090e22"); bg.addColorStop(.55, "#131b35"); bg.addColorStop(1, "#0c1225");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    ctx.save();
    const halo = ctx.createRadialGradient(x, y, 3, x, y, Math.max(radiusX, radiusY) * 2.4);
    halo.addColorStop(0, `hsla(${hue},88%,67%,.2)`); halo.addColorStop(1, `hsla(${hue},88%,55%,0)`);
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, Math.max(radiusX, radiusY) * 2.4, 0, Math.PI * 2); ctx.fill();
    const pill = ctx.createLinearGradient(x - radiusX, y - radiusY, x + radiusX, y + radiusY);
    pill.addColorStop(0, `hsla(${hue},75%,25%,.62)`); pill.addColorStop(.5, `hsla(${hue + 25},82%,34%,.42)`); pill.addColorStop(1, "rgba(16,24,52,.7)");
    ctx.fillStyle = pill; ctx.strokeStyle = `hsla(${hue},88%,78%,.56)`; ctx.lineWidth = 1.2; ctx.shadowColor = `hsl(${hue},90%,70%)`; ctx.shadowBlur = 23;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - radiusX, y - radiusY, radiusX * 2, radiusY * 2, radiusY) : ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    const textGradient = ctx.createLinearGradient(x - textW / 2, y, x + textW / 2, y);
    textGradient.addColorStop(0, `hsl(${hue + 48},100%,83%)`); textGradient.addColorStop(.48, "#fff7fd"); textGradient.addColorStop(1, `hsl(${hue - 18},100%,83%)`);
    drawName(ctx, text, x, y, { maxWidth: width * .72, maxHeight: Math.min(180, height * .26), size: 150, minSize: 28, color: textGradient, blur: 18, shadow: `hsl(${hue},95%,68%)` });
    hue = (hue + dt * 10) % 360;
    if ((hitX || hitY) && time - lastSound > .14) { emitSound(hitX && hitY ? "softChord" : "bell"); lastSound = time; }
  }
  return { resize, frame, destroy() {} };
}
