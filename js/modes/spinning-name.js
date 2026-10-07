import { setup2D, drawName, random, DISPLAY_FONT, TAU } from "./common.js";

export function createMode({ canvas, name, showName }) {
  const surface = setup2D(canvas, "#060817");
  const { ctx } = surface;
  let width = 1, height = 1, stars = [];
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    stars = Array.from({ length: 100 }, () => ({ x: random(0, w), y: random(0, h), r: random(.5, 1.5), p: random(0, TAU) }));
  }
  function frame(dt, time) {
    const bg = ctx.createLinearGradient(0, 0, width, height); bg.addColorStop(0, "#080d20"); bg.addColorStop(.5, "#1b1735"); bg.addColorStop(1, "#071120"); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    for (const star of stars) {
      ctx.globalAlpha = .25 + .4 * (Math.sin(time * .65 + star.p) + 1) / 2;
      ctx.fillStyle = "#d7e1ff"; ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const angle = time * .38;
    const face = Math.cos(angle);
    const scaleX = Math.max(.055, Math.abs(face));
    const side = face >= 0 ? 1 : -1;
    const centerX = width / 2, centerY = height / 2;
    if (showName) {
      for (let depth = 12; depth >= 1; depth--) {
        const shade = 18 + depth * 2.2;
        drawName(ctx, name, centerX + Math.sin(angle) * depth * 1.05, centerY + depth * 1.2, { maxWidth: width * .7, maxHeight: height * .26, size: 152, scaleX: scaleX * side, color: `hsl(218,55%,${shade}%)`, shadow: "transparent", blur: 0 });
      }
      const faceGradient = ctx.createLinearGradient(centerX - 180, centerY - 100, centerX + 180, centerY + 100);
      if (face >= 0) { faceGradient.addColorStop(0, "#f6ffff"); faceGradient.addColorStop(.35, "#a6e3ff"); faceGradient.addColorStop(.72, "#d8c4ff"); faceGradient.addColorStop(1, "#8c94ed"); }
      else { faceGradient.addColorStop(0, "#ffc6e9"); faceGradient.addColorStop(.45, "#f1d2ff"); faceGradient.addColorStop(1, "#a1c6ff"); }
      drawName(ctx, name, centerX, centerY, { maxWidth: width * .7, maxHeight: height * .26, size: 152, scaleX: scaleX * side, color: faceGradient, stroke: "rgba(255,255,255,.72)", strokeWidth: .8, shadow: "#8e7bfa", blur: 23 });
      const glintX = centerX + Math.sin(angle * 1.3) * width * .2;
      ctx.strokeStyle = "rgba(255,255,255,.23)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(glintX - 75, centerY - height * .14); ctx.lineTo(glintX + 75, centerY - height * .14); ctx.stroke();
    } else {
      const radius = Math.min(width, height) * .13;
      ctx.strokeStyle = "rgba(176,208,255,.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(centerX, centerY, radius * scaleX, radius, angle, 0, TAU); ctx.stroke();
    }
  }
  return { resize, frame, destroy() {} };
}
