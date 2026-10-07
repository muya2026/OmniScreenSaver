import { setup2D, random, TAU, clamp, drawName, smoothstep } from "./common.js";
import { scaledNameTargets } from "../name-shape.js";

export function createMode({ canvas, name, shape, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#070916");
  const { ctx } = surface;
  let width = 1, height = 1, shells = [], sparks = [], stars = [], targets = [], lastBurst = -1, launchAt = 1.5;
  const colors = ["#ffc778", "#fd91ce", "#9ce9ff", "#c3a5ff", "#b8ffd6"];
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    stars = Array.from({ length: 120 }, () => ({ x: random(0, w), y: random(0, h * .8), r: random(.4, 1.4), a: random(.2, .7) }));
    targets = showName ? scaledNameTargets(shape, w, h, 190, .48, .18) : [];
  }
  function launch() {
    shells.push({ x: random(width * .17, width * .83), y: height + 10, targetY: random(height * .2, height * .54), vy: random(-320, -235), color: colors[Math.floor(random(0, colors.length))], burst: false });
    emitSound("firework");
  }
  function explode(shell) {
    const count = Math.floor(random(36, 68));
    for (let i = 0; i < count; i++) {
      const angle = i / count * TAU + random(-.04, .04), velocity = random(32, 118);
      sparks.push({ x: shell.x, y: shell.y, px: shell.x, py: shell.y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: random(1.1, 2.4), maxLife: 2.4, color: Math.random() < .78 ? shell.color : colors[Math.floor(random(0, colors.length))], r: random(1.1, 2.8) });
    }
  }
  function frame(dt, time) {
    ctx.fillStyle = "rgba(5,7,18,.22)"; ctx.fillRect(0, 0, width, height);
    for (const star of stars) { ctx.globalAlpha = star.a * (.65 + .35 * Math.sin(time + star.x)); ctx.fillStyle = "#e3deff"; ctx.fillRect(star.x, star.y, star.r, star.r); }
    ctx.globalAlpha = 1;
    if (time >= launchAt) { launch(); launchAt = time + random(2.3, 4.3); }
    for (let i = shells.length - 1; i >= 0; i--) {
      const shell = shells[i]; shell.y += shell.vy * dt; shell.vy += 80 * dt;
      ctx.fillStyle = shell.color; ctx.shadowColor = shell.color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(shell.x, shell.y, 2.2, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      if (shell.y <= shell.targetY || shell.vy > -20) { explode(shell); shells.splice(i, 1); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i]; spark.px = spark.x; spark.py = spark.y; spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.vy += 45 * dt; spark.vx *= .993; spark.life -= dt;
      const alpha = clamp(spark.life / spark.maxLife, 0, 1);
      ctx.globalAlpha = alpha; ctx.strokeStyle = spark.color; ctx.lineWidth = spark.r; ctx.shadowColor = spark.color; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.moveTo(spark.px, spark.py); ctx.lineTo(spark.x, spark.y); ctx.stroke();
      if (spark.life <= 0) sparks.splice(i, 1);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    const phase = time % 18;
    const nameGlow = showName ? smoothstep(5, 7, phase) * (1 - smoothstep(13, 15, phase)) : 0;
    if (showName && nameGlow > .05) {
      for (let i = 0; i < targets.length; i++) {
        const point = targets[i]; const pulse = .55 + .45 * Math.sin(time * 3 + i * .6);
        ctx.globalAlpha = nameGlow * pulse; ctx.fillStyle = i % 3 ? "#ffd894" : "#ffecc4"; ctx.shadowColor = "#ffb85e"; ctx.shadowBlur = 13;
        ctx.beginPath(); ctx.arc(point.x + Math.sin(time + i) * 1.8, point.y, 1.1 + pulse * 1.3, 0, TAU); ctx.fill();
      }
      drawName(ctx, name, width / 2, height / 2, { maxWidth: width * .5, maxHeight: height * .14, size: 100, color: "rgba(255,222,174,.55)", blur: 24, shadow: "#ffac57", alpha: nameGlow * .42 });
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    const cycle = Math.floor(time / 18);
    if (cycle !== lastBurst && phase < .2) { lastBurst = cycle; if (showName) emitSound("softChime"); }
  }
  return { resize, frame, destroy() {} };
}
