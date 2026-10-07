import { setup2D, random, drawName, drawPine, drawGlowDot, smoothstep, clamp, TAU } from "./common.js";
import { scaledNameTargets } from "../name-shape.js";

export function createMode({ canvas, name, shape, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#070b1a");
  const { ctx } = surface;
  let width = 1, height = 1, stars = [], embers = [], nameTargets = [], lastCrackle = 0;
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    stars = Array.from({ length: 125 }, () => ({ x: random(0, w), y: random(0, h * .62), r: random(.4, 1.6), p: random(0, TAU) }));
    embers = Array.from({ length: 48 }, () => ({ x: w / 2 + random(-w * .06, w * .06), y: h * .76, vx: random(-19, 19), vy: random(-88, -25), life: random(.2, 1), size: random(1, 3.3), phase: random(0, TAU) }));
    nameTargets = showName ? scaledNameTargets(shape, w, h, 230, .42, .12).map(point => ({ x: point.x, y: point.y - h * .21 })) : [];
  }
  function frame(dt, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#080d23"); sky.addColorStop(.52, "#192039"); sky.addColorStop(.8, "#39253a"); sky.addColorStop(1, "#111821"); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    const moon = ctx.createRadialGradient(width * .76, height * .18, 1, width * .76, height * .18, Math.min(width, height) * .14); moon.addColorStop(0, "rgba(203,228,255,.18)"); moon.addColorStop(1, "rgba(155,195,255,0)"); ctx.fillStyle = moon; ctx.fillRect(width * .58, height * .04, width * .36, height * .28);
    ctx.fillStyle = "#e2e5f2"; ctx.globalAlpha = .72; ctx.beginPath(); ctx.arc(width * .76, height * .18, Math.min(width, height) * .034, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    for (const star of stars) { ctx.globalAlpha = .2 + .55 * (Math.sin(time * .8 + star.p) + 1) / 2; ctx.fillStyle = "#e4ecff"; ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    const ridge = height * .69; ctx.fillStyle = "#101923"; ctx.beginPath(); ctx.moveTo(0, ridge + 20); ctx.lineTo(width * .18, ridge - height * .09); ctx.lineTo(width * .37, ridge + 8); ctx.lineTo(width * .57, ridge - height * .13); ctx.lineTo(width * .8, ridge - height * .01); ctx.lineTo(width, ridge - height * .12); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 15; i++) { const x = (i / 14) * width; const scale = .14 + (i % 4) * .035; drawPine(ctx, x, ridge + height * .13, height * scale, i % 2 ? "#08131b" : "#0a1720", Math.sin(time * .18 + i) * 2); }
    const groundY = height * .84;
    ctx.fillStyle = "#121a1e"; ctx.fillRect(0, groundY, width, height - groundY);
    const fireX = width / 2, fireY = height * .78;
    const glow = ctx.createRadialGradient(fireX, fireY, 4, fireX, fireY, Math.min(width, height) * .26); glow.addColorStop(0, "rgba(255,145,56,.48)"); glow.addColorStop(.45, "rgba(220,74,38,.16)"); glow.addColorStop(1, "rgba(255,102,47,0)"); ctx.fillStyle = glow; ctx.fillRect(fireX - height * .3, fireY - height * .25, height * .6, height * .48);
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "#5c342c"; ctx.lineWidth = Math.max(9, height * .022); ctx.shadowColor = "#f87944"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(fireX - width * .075, fireY + height * .015); ctx.lineTo(fireX + width * .07, fireY + height * .075); ctx.moveTo(fireX - width * .066, fireY + height * .075); ctx.lineTo(fireX + width * .069, fireY + height * .005); ctx.stroke(); ctx.restore();
    const flameHeight = height * (.16 + .025 * Math.sin(time * 6.5));
    for (let layer = 0; layer < 4; layer++) {
      const w = height * (.075 - layer * .011), h = flameHeight * (1 - layer * .11), drift = Math.sin(time * (4 + layer) + layer) * height * .009;
      ctx.save(); ctx.fillStyle = ["#ffb237", "#ff772e", "#ff4d38", "#ffe69b"][layer]; ctx.shadowColor = layer === 3 ? "#fff0a1" : "#ff6832"; ctx.shadowBlur = 16 + layer * 4;
      ctx.beginPath(); ctx.moveTo(fireX - w, fireY); ctx.bezierCurveTo(fireX - w * 1.25 + drift, fireY - h * .54, fireX + w * .34 + drift, fireY - h * .76, fireX + drift, fireY - h); ctx.bezierCurveTo(fireX + w * .73 + drift, fireY - h * .57, fireX + w * 1.1, fireY - h * .34, fireX + w, fireY); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    for (const ember of embers) {
      ember.x += ember.vx * dt + Math.sin(time * 2 + ember.phase) * 9 * dt; ember.y += ember.vy * dt; ember.life -= dt * .12;
      if (ember.y < height * .27 || ember.life <= 0) Object.assign(ember, { x: fireX + random(-height * .07, height * .07), y: fireY - height * .02, vx: random(-20, 20), vy: random(-92, -28), life: random(.5, 1), size: random(1, 3.3), phase: random(0, TAU) });
      drawGlowDot(ctx, ember.x, ember.y, ember.size, ember.phase > 3 ? "#ffd88a" : "#ff9b4d", 9, clamp(ember.life, .1, .9));
    }
    const phase = time % 19; const gather = showName ? smoothstep(5, 7.5, phase) * (1 - smoothstep(13, 16.2, phase)) : 0;
    if (showName && gather > .04) {
      for (let i = 0; i < nameTargets.length; i++) {
        const p = nameTargets[i]; const flicker = .55 + .45 * Math.sin(time * 4 + i * 1.7);
        drawGlowDot(ctx, p.x + Math.sin(time + i) * 1.5, p.y, 1.1 + flicker, i % 4 ? "#ffba57" : "#fff0b4", 11, gather * flicker);
      }
      drawName(ctx, name, fireX, height * .29, { maxWidth: width * .5, maxHeight: height * .13, size: 105, color: "rgba(255,205,132,.34)", shadow: "#ff743b", blur: 25, alpha: gather * .65 });
    }
    const crackle = Math.floor(time / 4.5);
    if (crackle !== lastCrackle) { lastCrackle = crackle; emitSound("crackle"); }
  }
  return { resize, frame, destroy() {} };
}
