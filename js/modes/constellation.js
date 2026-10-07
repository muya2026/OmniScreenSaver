import { setup2D, random, TAU, clamp, drawName, smoothstep, drawGlowDot } from "./common.js";
import { scaledNameTargets } from "../name-shape.js";

export function createMode({ canvas, name, shape, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#070a1d");
  const { ctx } = surface;
  let width = 1, height = 1, nodes = [], targetPoints = [], lastCue = 0;
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    targetPoints = showName ? scaledNameTargets(shape, w, h, 120, .54, .2) : [];
    const count = Math.max(90, Math.min(230, targetPoints.length + 70));
    nodes = Array.from({ length: count }, (_, index) => {
      const target = targetPoints[index % Math.max(1, targetPoints.length)];
      return {
        x: target && index < targetPoints.length ? target.x + random(-30, 30) : random(0, w),
        y: target && index < targetPoints.length ? target.y + random(-25, 25) : random(0, h),
        tx: target ? target.x : random(0, w), ty: target ? target.y : random(0, h),
        orbitX: random(0, w), orbitY: random(0, h), phase: random(0, TAU), r: random(1, 2.5), named: index < targetPoints.length
      };
    });
  }
  function frame(dt, time) {
    ctx.fillStyle = "rgba(4,7,19,.27)"; ctx.fillRect(0, 0, width, height);
    const cycle = time % 17;
    const gather = showName ? smoothstep(3.5, 6.4, cycle) * (1 - smoothstep(11.5, 15, cycle)) : 0;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const driftX = Math.sin(time * .14 + node.phase) * 24;
      const driftY = Math.cos(time * .17 + node.phase * 1.3) * 19;
      const targetX = node.named && gather > .03 ? node.tx : node.orbitX + driftX;
      const targetY = node.named && gather > .03 ? node.ty : node.orbitY + driftY;
      node.x += (targetX - node.x) * Math.min(1, dt * (node.named ? 2.4 + gather * 2 : .35));
      node.y += (targetY - node.y) * Math.min(1, dt * (node.named ? 2.4 + gather * 2 : .35));
      if (!node.named && (node.x < -20 || node.x > width + 20 || node.y < -20 || node.y > height + 20)) { node.orbitX = random(0, width); node.orbitY = random(0, height); }
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      let connected = 0;
      for (let j = i + 1; j < nodes.length && connected < 5; j++) {
        const b = nodes[j]; const dx = a.x - b.x, dy = a.y - b.y; const distance = Math.hypot(dx, dy);
        const radius = (a.named && b.named && gather > .12) ? 83 : 78;
        if (distance < radius) {
          const nameLine = a.named && b.named && gather > .12;
          ctx.strokeStyle = nameLine ? `rgba(150,225,255,${(.46 * gather) * (1 - distance / radius)})` : `rgba(156,172,255,${.15 * (1 - distance / radius)})`;
          ctx.lineWidth = nameLine ? 1.3 : .7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); connected++;
        }
      }
      const alpha = a.named && gather > .05 ? .4 + gather * .6 : .55;
      drawGlowDot(ctx, a.x, a.y, a.named && gather > .1 ? 1.8 : a.r, a.named ? "#c9f2ff" : "#b8a8ff", a.named ? 12 : 8, alpha);
    }
    if (showName && gather > .2) drawName(ctx, name, width / 2, height / 2, { maxWidth: width * .52, maxHeight: height * .16, size: 100, color: "rgba(197,231,255,.2)", shadow: "#91bfff", blur: 20, alpha: gather * .8 });
    const cycleNo = Math.floor(time / 17);
    if (cycleNo !== lastCue && cycle < .2) { lastCue = cycleNo; emitSound("twinkle"); }
  }
  return { resize, frame, destroy() {} };
}
