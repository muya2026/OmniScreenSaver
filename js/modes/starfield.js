import { setup2D, random, clamp, smoothstep, drawName, TAU } from "./common.js";
import { scaledNameTargets } from "../name-shape.js";

export function createMode({ canvas, name, shape, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#030610");
  const { ctx } = surface;
  let stars = [];
  let namePoints = [];
  let lastCycle = -1;
  function resize(width, height, ratio) {
    surface.resize(width, height, ratio);
    stars = Array.from({ length: Math.min(560, Math.round(width * height / 2500)) }, () => ({
      x: random(-width / 2, width / 2), y: random(-height / 2, height / 2), z: random(.06, 1), r: random(.35, 1.8), hue: random(175, 275)
    }));
    namePoints = showName ? scaledNameTargets(shape, width, height, 400, .58, .24) : [];
  }
  function frame(dt, time) {
    const { width, height } = surface;
    const cycle = time % 16;
    const warp = cycle < 4 ? .06 + cycle / 4 * .26 : cycle < 7 ? .32 : cycle < 11 ? .32 * (1 - (cycle - 7) / 4) : .03;
    const gather = showName ? smoothstep(3.6, 6.1, cycle) * (1 - smoothstep(9.6, 11.7, cycle)) : 0;
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#070b1c"); bg.addColorStop(.52, "#111437"); bg.addColorStop(1, "#030611");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    const cx = width / 2, cy = height / 2;
    for (let starIndex = 0; starIndex < stars.length; starIndex++) {
      const star = stars[starIndex];
      const oldZ = star.z;
      star.z -= dt * (.055 + oldZ * .28 + warp * 1.15);
      if (star.z < .04) {
        star.x = random(-width / 2, width / 2); star.y = random(-height / 2, height / 2); star.z = 1;
      }
      const scale = 1 / star.z;
      const sx = cx + star.x * scale, sy = cy + star.y * scale;
      if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) continue;
      const radius = Math.min(5, star.r * scale * .48);
      const alpha = clamp(.2 + (1 - star.z) * .65, .12, .88);
      ctx.globalAlpha = alpha * (1 - gather * .45);
      ctx.fillStyle = `hsl(${star.hue} 82% 84%)`;
      ctx.beginPath(); ctx.arc(sx, sy, radius, 0, TAU); ctx.fill();
      if (warp > .18) {
        ctx.strokeStyle = `hsla(${star.hue} 86% 76% / ${alpha * warp})`;
        ctx.lineWidth = Math.max(.4, radius * .55);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx + (sx - cx) * (1 + warp * .13), cy + (sy - cy) * (1 + warp * .13)); ctx.stroke();
      }
      if (gather > 0 && namePoints.length) {
        const index = Math.floor((star.x * 13 + star.y * 7 + starIndex * 31) % namePoints.length + namePoints.length) % namePoints.length;
        const target = namePoints[index];
        const px = sx + (target.x - sx) * gather;
        const py = sy + (target.y - sy) * gather;
        ctx.globalAlpha = .7 + gather * .3;
        ctx.fillStyle = "#d8f7ff";
        ctx.beginPath(); ctx.arc(px, py, radius * (1 + gather), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (gather > .12 && showName) {
      const hold = smoothstep(.2, .75, gather) * .58;
      const gradient = ctx.createLinearGradient(cx - 150, cy, cx + 180, cy);
      gradient.addColorStop(0, "#a3e4ff"); gradient.addColorStop(.5, "#f1eaff"); gradient.addColorStop(1, "#d1a4ff");
      drawName(ctx, name, cx, cy, { maxWidth: width * .75, maxHeight: height * .22, size: 140, color: gradient, alpha: hold, shadow: "#91c8ff", blur: 30, stroke: "rgba(189,224,255,.65)", strokeWidth: 1.2 });
    }
    const currentCycle = Math.floor(time / 16);
    if (currentCycle !== lastCycle && cycle < .2) { lastCycle = currentCycle; emitSound("whoosh"); }
  }
  return { resize, frame, destroy() {} };
}
