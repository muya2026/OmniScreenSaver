import { setup2D, drawName, drawGroundGrid, roundedRect, TAU } from "./common.js";

export function createMode({ canvas, name, showName }) {
  const surface = setup2D(canvas, "#10132d");
  const { ctx } = surface;
  let width = 1, height = 1;
  function resize(w, h, ratio) { surface.resize(w, h, ratio); width = w; height = h; }
  function frame(dt, time) {
    const horizon = height * .58;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, "#111b3b"); sky.addColorStop(.5, "#46305e"); sky.addColorStop(1, "#ed829f"); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width / 2, horizon * .78, 1, width / 2, horizon * .78, width * .36); glow.addColorStop(0, "rgba(255,213,151,.38)"); glow.addColorStop(1, "rgba(255,115,168,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, horizon + 80);
    const sunRadius = Math.min(width * .16, height * .24); const sunY = horizon * .69;
    const sun = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius); sun.addColorStop(0, "#fff0bc"); sun.addColorStop(.4, "#ffadad"); sun.addColorStop(1, "#ed62af");
    ctx.save(); ctx.beginPath(); ctx.arc(width / 2, sunY, sunRadius, Math.PI, 0); ctx.lineTo(width / 2 + sunRadius, sunY); ctx.lineTo(width / 2 - sunRadius, sunY); ctx.closePath(); ctx.fillStyle = sun; ctx.shadowColor = "#ff70b0"; ctx.shadowBlur = 35; ctx.fill(); ctx.shadowBlur = 0;
    for (let i = 0; i < 7; i++) {
      const y = sunY + sunRadius * (.18 + i * .12) + (i > 3 ? (time * 9) % 4 : 0);
      ctx.fillStyle = `rgba(32,22,57,${i < 3 ? .27 : .75})`; ctx.fillRect(width / 2 - sunRadius, y, sunRadius * 2, Math.max(2, height * .006));
    }
    ctx.restore();
    ctx.fillStyle = "#10162e"; ctx.fillRect(0, horizon, width, height - horizon);
    drawGroundGrid(ctx, width, height, horizon, time, "rgba(71,247,227,.67)");
    const ridge = height * .46;
    ctx.fillStyle = "rgba(22,22,52,.82)"; ctx.beginPath(); ctx.moveTo(0, ridge + 35); ctx.lineTo(width * .13, ridge - 32); ctx.lineTo(width * .23, ridge + 4); ctx.lineTo(width * .39, ridge - 55); ctx.lineTo(width * .56, ridge + 8); ctx.lineTo(width * .72, ridge - 42); ctx.lineTo(width * .88, ridge + 4); ctx.lineTo(width, ridge - 21); ctx.lineTo(width, horizon); ctx.lineTo(0, horizon); ctx.closePath(); ctx.fill();
    if (showName) {
      const y = Math.min(height * .37, horizon - 30);
      for (let depth = 8; depth >= 1; depth--) drawName(ctx, name, width / 2 + depth * .65, y + depth * 1.3, { maxWidth: width * .72, maxHeight: height * .18, size: 130, color: `hsl(${278 + depth * 2},65%,${24 + depth * 2}%)`, blur: 0, shadow: "transparent" });
      const chrome = ctx.createLinearGradient(0, y - 52, 0, y + 48); chrome.addColorStop(0, "#fffad1"); chrome.addColorStop(.2, "#ffb3ce"); chrome.addColorStop(.44, "#ffeafb"); chrome.addColorStop(.55, "#aeeff5"); chrome.addColorStop(.76, "#fc93c6"); chrome.addColorStop(1, "#ffe4aa");
      drawName(ctx, name, width / 2, y, { maxWidth: width * .72, maxHeight: height * .18, size: 130, color: chrome, stroke: "rgba(255,255,255,.6)", strokeWidth: 1.3, blur: 22, shadow: "#ff80cf" });
      ctx.fillStyle = "rgba(13,18,43,.8)"; roundedRect(ctx, width * .08, height * .88, width * .84, 1, 1); ctx.fill();
    }
  }
  return { resize, frame, destroy() {} };
}
