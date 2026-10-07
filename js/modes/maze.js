import { setup2D, drawName, random, clamp, TAU } from "./common.js";

export function createMode({ canvas, name, showName }) {
  const surface = setup2D(canvas, "#090b1b");
  const { ctx } = surface;
  let width = 1, height = 1, hallway = [];
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    hallway = Array.from({ length: 8 }, (_, index) => ({ turn: Math.random() < .5 ? -1 : 1, light: random(.15, .5), index }));
  }
  function frame(dt, time) {
    const horizon = height * .43;
    const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#0b1533"); sky.addColorStop(.42, "#252344"); sky.addColorStop(1, "#080d1b");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width / 2, horizon, 2, width / 2, horizon, width * .45); glow.addColorStop(0, "rgba(255,190,128,.3)"); glow.addColorStop(1, "rgba(255,173,119,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    const depth = ((time * .18) % 1);
    const segments = 8;
    ctx.lineWidth = 1;
    for (let i = 0; i < segments; i++) {
      const z0 = (i + depth) / segments;
      const z1 = (i + 1 + depth) / segments;
      const scale0 = z0 * z0, scale1 = Math.min(1, z1 * z1);
      const half0 = width * (.025 + scale0 * .57), half1 = width * (.025 + scale1 * .57);
      const y0 = horizon + (height - horizon) * scale0, y1 = horizon + (height - horizon) * scale1;
      const shift = Math.sin(time * .19 + i * .7) * width * .018 * scale0;
      ctx.fillStyle = i % 2 ? "rgba(37,38,58,.84)" : "rgba(47,43,62,.84)";
      ctx.beginPath(); ctx.moveTo(width / 2 - half0 + shift, y0); ctx.lineTo(width / 2 + half0 + shift, y0); ctx.lineTo(width / 2 + half1 + shift, y1); ctx.lineTo(width / 2 - half1 + shift, y1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(245,194,146,${.15 + scale0 * .35})`; ctx.beginPath(); ctx.moveTo(width / 2 - half0 + shift, y0); ctx.lineTo(width / 2 - half1 + shift, y1); ctx.moveTo(width / 2 + half0 + shift, y0); ctx.lineTo(width / 2 + half1 + shift, y1); ctx.stroke();
      const floorY = y0 + (y1 - y0) * .83;
      ctx.strokeStyle = `rgba(255,211,167,${.07 + scale0 * .3})`; ctx.beginPath(); ctx.moveTo(width / 2 - half0 + shift, floorY); ctx.lineTo(width / 2 + half0 + shift, floorY); ctx.stroke();
      if (i % 2 === 0) {
        const s = .07 + scale0 * .13;
        const wallSide = hallway[i].turn;
        const px = width / 2 + wallSide * (half0 * .92) + shift;
        const py = horizon + (height - horizon) * (.32 + scale0 * .5);
        ctx.fillStyle = `rgba(255,185,120,${hallway[i].light * (1 - scale0 * .4)})`; ctx.shadowColor = "#ffb46e"; ctx.shadowBlur = 14 * scale0;
        ctx.beginPath(); ctx.ellipse(px, py, width * s * .045, height * s * .045, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      }
    }
    ctx.strokeStyle = "rgba(250,203,152,.19)"; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const p = (i / 5 + depth) % 1; const z = p * p;
      const y = horizon + (height - horizon) * z;
      ctx.beginPath(); ctx.moveTo(width / 2 - width * (.03 + z * .57), y); ctx.lineTo(width / 2 + width * (.03 + z * .57), y); ctx.stroke();
    }
    if (showName) {
      const signX = width * .72, signY = height * .39 + Math.sin(time * .24) * 5;
      ctx.save(); ctx.translate(signX, signY); ctx.transform(.86, -.04, -.23, 1, 0, 0);
      ctx.fillStyle = "rgba(11,18,32,.78)"; ctx.strokeStyle = "rgba(255,200,144,.66)"; ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(255,160,96,.48)"; ctx.shadowBlur = 18;
      ctx.fillRect(-Math.min(width * .2, 170), -Math.min(height * .07, 58), Math.min(width * .4, 340), Math.min(height * .14, 116)); ctx.strokeRect(-Math.min(width * .2, 170), -Math.min(height * .07, 58), Math.min(width * .4, 340), Math.min(height * .14, 116));
      ctx.shadowBlur = 0;
      drawName(ctx, name, 0, 0, { maxWidth: Math.min(width * .34, 280), maxHeight: Math.min(height * .105, 72), size: 76, color: "#ffe9c9", shadow: "#ffad6b", blur: 12 });
      ctx.restore();
    }
  }
  return { resize, frame, destroy() {} };
}
