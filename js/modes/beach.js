import { setup2D, random, TAU, drawName, drawGlowDot, clamp, smoothstep } from "./common.js";

export function createMode({ canvas, name, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#091229");
  const { ctx } = surface;
  let width = 1, height = 1, stars = [], embers = [], lastWave = 0;
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    stars = Array.from({ length: 95 }, () => ({ x: random(0, w), y: random(0, h * .48), r: random(.4, 1.3), p: random(0, TAU) }));
    embers = Array.from({ length: 26 }, () => ({ x: w / 2 + random(-25, 25), y: h * .64, vx: random(-16, 16), vy: random(-70, -25), life: random(.1, 1), r: random(1, 2.8) }));
  }
  function frame(dt, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, height * .72); sky.addColorStop(0, "#0a1433"); sky.addColorStop(.58, "#413554"); sky.addColorStop(1, "#ca806f"); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height * .75);
    const moonX = width * .77, moonY = height * .2, moonR = Math.min(width, height) * .043;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 1, moonX, moonY, moonR * 4); moonGlow.addColorStop(0, "rgba(255,226,192,.32)"); moonGlow.addColorStop(1, "rgba(255,212,186,0)"); ctx.fillStyle = moonGlow; ctx.fillRect(moonX - moonR * 4, moonY - moonR * 4, moonR * 8, moonR * 8);
    ctx.fillStyle = "#ffe4c3"; ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, TAU); ctx.fill();
    for (const star of stars) { ctx.globalAlpha = .18 + .5 * (Math.sin(time + star.p) + 1) / 2; ctx.fillStyle = "#ffe8d6"; ctx.fillRect(star.x, star.y, star.r, star.r); } ctx.globalAlpha = 1;
    const seaY = height * .52;
    const sea = ctx.createLinearGradient(0, seaY, 0, height * .78); sea.addColorStop(0, "#24516c"); sea.addColorStop(.55, "#173b55"); sea.addColorStop(1, "#122a42"); ctx.fillStyle = sea; ctx.fillRect(0, seaY, width, height * .27);
    ctx.save(); ctx.globalAlpha = .6; ctx.strokeStyle = "rgba(255,211,165,.45)"; ctx.lineWidth = 1.3;
    for (let i = 0; i < 18; i++) {
      const y = seaY + i * height * .012 + Math.sin(time * .7 + i) * 2;
      const span = width * (.04 + .14 * (1 - i / 20)); const center = width * .77 + Math.sin(time * .24 + i * .7) * width * .07;
      ctx.beginPath(); ctx.moveTo(center - span, y); ctx.quadraticCurveTo(center, y + Math.sin(time + i) * 3, center + span, y); ctx.stroke();
    }
    ctx.restore();
    const sandY = height * .72;
    const sand = ctx.createLinearGradient(0, sandY, 0, height); sand.addColorStop(0, "#b47c65"); sand.addColorStop(.35, "#9f6959"); sand.addColorStop(1, "#3e3e4b"); ctx.fillStyle = sand; ctx.fillRect(0, sandY, width, height - sandY);
    const fireX = width * .5, fireY = height * .69;
    const reflection = ctx.createRadialGradient(fireX, fireY, 2, fireX, fireY, height * .18); reflection.addColorStop(0, "rgba(255,155,85,.3)"); reflection.addColorStop(1, "rgba(255,155,85,0)"); ctx.fillStyle = reflection; ctx.fillRect(fireX - height * .18, fireY - height * .18, height * .36, height * .36);
    ctx.strokeStyle = "#573735"; ctx.lineWidth = Math.max(7, height * .015); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(fireX - width * .05, fireY + 8); ctx.lineTo(fireX + width * .05, fireY + 20); ctx.moveTo(fireX - width * .05, fireY + 20); ctx.lineTo(fireX + width * .05, fireY + 7); ctx.stroke();
    for (let layer = 0; layer < 3; layer++) {
      const flameW = height * (.055 - layer * .012), flameH = height * (.11 + .01 * Math.sin(time * (4 + layer)));
      ctx.fillStyle = ["#ffb43d", "#ff6635", "#ffe29a"][layer]; ctx.shadowColor = "#ff7c3e"; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(fireX - flameW, fireY + 5); ctx.quadraticCurveTo(fireX - flameW * .65, fireY - flameH * .65, fireX + Math.sin(time * 4 + layer) * flameW * .25, fireY - flameH); ctx.quadraticCurveTo(fireX + flameW * 1.2, fireY - flameH * .35, fireX + flameW, fireY + 5); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const ember of embers) {
      ember.x += ember.vx * dt; ember.y += ember.vy * dt; ember.life -= dt * .13;
      if (ember.y < height * .35 || ember.life <= 0) Object.assign(ember, { x: fireX + random(-22, 22), y: fireY, vx: random(-18, 18), vy: random(-76, -23), life: random(.4, 1), r: random(1, 2.8) });
      drawGlowDot(ctx, ember.x, ember.y, ember.r, "#ffd18a", 9, clamp(ember.life, .1, .8));
    }
    const cycle = (time % 13) / 13;
    const wash = smoothstep(.56, .87, cycle);
    if (showName) {
      drawName(ctx, name, width / 2, height * .87, { maxWidth: width * .68, maxHeight: height * .09, size: 68, color: `rgba(255,221,180,${.79 - wash * .67})`, shadow: "rgba(255,194,154,.45)", blur: 7, alpha: .9 });
      const waveY = height * (.97 - wash * .1);
      ctx.save(); ctx.globalAlpha = .12 + wash * .32; ctx.fillStyle = "#6ed8e0"; ctx.beginPath(); ctx.moveTo(0, waveY);
      for (let x = 0; x <= width + 10; x += 10) ctx.lineTo(x, waveY + Math.sin(x * .018 + time * 2) * 4);
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    const waveNo = Math.floor(time / 6.5);
    if (waveNo !== lastWave) { lastWave = waveNo; emitSound("wave"); }
  }
  return { resize, frame, destroy() {} };
}
