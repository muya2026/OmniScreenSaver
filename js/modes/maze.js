import { setup2D, TAU, clamp, random, lerp, rgba, drawStyledName, drawVignette, drawGlowDot } from "./common.js";
import { typeStyle } from "./type-styles.js";
import { noise2, fbm3, flicker } from "../motion.js";

/**
 * 3D Maze.
 *
 * You drift down a corridor that keeps rebuilding itself ahead of you, with
 * the unhurried bob of someone walking. A lamp hangs in the passage and its
 * flame breathes on its own rhythm, so the walls brighten and dim as you pass
 * under it. Your name hangs on a sign that swings on its bracket and catches
 * the light as it goes by.
 */
const SEGMENTS = 9;

export function createMode({ canvas, name, language = "en", showName, emitSound = () => {}, preview = false }) {
  const surface = setup2D(canvas, "#090b1b");
  const { ctx } = surface;
  const style = typeStyle("maze");
  let width = 1;
  let height = 1;
  let turns = [];
  let lanternSide = 1;
  let bobPhase = 0;
  let lastCue = 0;
  let sway = 0;
  let swayVelocity = 0;

  function resize(w, h, ratio) {
    surface.resize(w, h, ratio);
    width = w;
    height = h;
    turns = Array.from({ length: SEGMENTS + 2 }, (_, index) => ({
      turn: noise2(index * 2.3, index) > 0 ? 1 : -1,
      lamp: noise2(index * 5.1, index * 3) > 0.35,
      seed: random(0, 40)
    }));
  }

  function frame(dt, time) {
    const horizon = height * 0.44;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#0a1430");
    sky.addColorStop(0.4, "#221f42");
    sky.addColorStop(1, "#070b18");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Walking bob: two out-of-step sines plus noise, never a clean loop.
    bobPhase += dt * 2.1;
    const bob = Math.sin(bobPhase) * height * 0.006 + Math.sin(bobPhase * 0.53 + 1.2) * height * 0.003;
    const driftX = fbm3(time * 0.07, 3.2, 0, { octaves: 2, seed: 8 }) * width * 0.02;
    const lanternGlow = 0.55 + flicker(time, 5, { speed: 1.5 }) * 0.45;

    const depth = ((time * 0.14) % 1);
    const cx = width / 2 + driftX;
    const cy = horizon + bob;

    for (let i = 0; i < SEGMENTS; i++) {
      const z0 = (i + depth) / SEGMENTS;
      const z1 = (i + 1 + depth) / SEGMENTS;
      const scale0 = z0 * z0;
      const scale1 = Math.min(1.6, z1 * z1);
      const half0 = width * (0.03 + scale0 * 0.62);
      const half1 = width * (0.03 + scale1 * 0.62);
      const y0 = cy + (height - cy) * scale0;
      const y1 = cy + (height - cy) * scale1;
      const shift = Math.sin(time * 0.16 + i * 0.8) * width * 0.02 * scale0;
      const shade = i % 2 ? 0.16 : 0.21;
      const near = clamp(1 - Math.abs(z0 - 0.42) * 2.6, 0, 1) * lanternGlow;

      // Left and right walls pick up different amounts of lamplight
      const leftLight = clamp(near * (lanternSide > 0 ? 1 : 0.42), 0, 1);
      const rightLight = clamp(near * (lanternSide > 0 ? 0.42 : 1), 0, 1);
      ctx.fillStyle = `rgba(${Math.round(28 + leftLight * 96)},${Math.round(26 + leftLight * 68)},${Math.round(44 + leftLight * 34)},${0.9})`;
      ctx.beginPath();
      ctx.moveTo(cx - half0 + shift, y0);
      ctx.lineTo(cx - half0 * 0.24 + shift, y0 + (y1 - y0) * 0.12);
      ctx.lineTo(cx - half1 * 0.24 + shift, y1);
      ctx.lineTo(cx - half1 + shift, y1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(${Math.round(30 + rightLight * 96)},${Math.round(28 + rightLight * 68)},${Math.round(46 + rightLight * 34)},${0.9})`;
      ctx.beginPath();
      ctx.moveTo(cx + half0 + shift, y0);
      ctx.lineTo(cx + half0 * 0.24 + shift, y0 + (y1 - y0) * 0.12);
      ctx.lineTo(cx + half1 * 0.24 + shift, y1);
      ctx.lineTo(cx + half1 + shift, y1);
      ctx.closePath();
      ctx.fill();

      // Ceiling and floor
      ctx.fillStyle = `rgba(${Math.round(16 + near * 44)},${Math.round(16 + near * 34)},${Math.round(30 + near * 20)},.85)`;
      ctx.beginPath();
      ctx.moveTo(cx - half0 + shift, y0);
      ctx.lineTo(cx + half0 + shift, y0);
      ctx.lineTo(cx + half1 + shift, y1);
      ctx.lineTo(cx - half1 + shift, y1);
      ctx.closePath();
      ctx.fill();

      const floorY = y0 + (y1 - y0) * 0.86;
      ctx.fillStyle = `rgba(${Math.round(20 + near * 60)},${Math.round(18 + near * 44)},${Math.round(26 + near * 24)},.9)`;
      ctx.beginPath();
      ctx.moveTo(cx - half0 + shift, floorY);
      ctx.lineTo(cx + half0 + shift, floorY);
      ctx.lineTo(cx + half1 + shift, y1);
      ctx.lineTo(cx - half1 + shift, y1);
      ctx.closePath();
      ctx.fill();

      // Stone joints
      ctx.strokeStyle = `rgba(${Math.round(120 + near * 90)},${Math.round(100 + near * 70)},${Math.round(80 + near * 40)},${0.05 + near * 0.12})`;
      ctx.lineWidth = 1;
      for (let band = 0; band < 3; band++) {
        const p = band / 3;
        const yy = lerp(y0, y1, p);
        const hh = lerp(half0, half1, p);
        ctx.beginPath();
        ctx.moveTo(cx - hh + shift, yy);
        ctx.lineTo(cx + hh + shift, yy);
        ctx.stroke();
      }
    }

    // Hanging lamp in the passage
    const lampZ = 0.4;
    const lampScale = lampZ * lampZ;
    const lampX = cx + lanternSide * width * (0.03 + lampScale * 0.5);
    const lampY = cy + (height - cy) * lampScale * 0.2;
    const lampSize = Math.max(4, width * 0.012 * (0.4 + lampScale * 2.2));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const lampLight = ctx.createRadialGradient(lampX, lampY, 1, lampX, lampY, lampSize * 9);
    lampLight.addColorStop(0, `rgba(255,196,124,${0.55 * lanternGlow})`);
    lampLight.addColorStop(0.35, `rgba(255,150,80,${0.16 * lanternGlow})`);
    lampLight.addColorStop(1, "rgba(255,140,70,0)");
    ctx.fillStyle = lampLight;
    ctx.beginPath();
    ctx.arc(lampX, lampY, lampSize * 9, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(60,48,40,.85)";
    ctx.lineWidth = Math.max(1, lampSize * 0.14);
    ctx.beginPath();
    ctx.moveTo(lampX, lampY - lampSize * 5);
    ctx.lineTo(lampX, lampY);
    ctx.stroke();
    drawGlowDot(ctx, lampX, lampY, lampSize * 0.62, `rgba(255,${Math.round(190 + lanternGlow * 50)},${Math.round(120 + lanternGlow * 60)},1)`, lampSize * 3, 1);

    // The sign: it swings on its bracket and catches the lamplight
    if (showName) {
      const signCycle = (time * 0.16) % 1;
      const z = clamp(1 - signCycle, 0.02, 1);
      const scale = 0.12 + z * z * 1.5;
      const signW = Math.min(width * 0.42, 360) * scale;
      const signH = Math.min(height * 0.13, 110) * scale;
      const signX = cx - lanternSide * width * 0.04 * scale;
      const signY = cy + (height - cy) * (z * z) * 0.34 + bob;

      // Pendulum: the sign is nudged by the walking motion and settles.
      const drive = Math.sin(bobPhase) * 0.05 + fbm3(time * 0.2, 1.7, 0, { octaves: 2, seed: 2 }) * 0.05;
      swayVelocity += (drive - sway) * 26 * dt;
      swayVelocity *= Math.exp(-2.4 * dt);
      sway += swayVelocity * dt;

      if (scale > 0.16 && signX + signW > 0 && signX - signW < width) {
        ctx.save();
        ctx.translate(signX, signY);
        ctx.rotate(sway * 0.5);
        ctx.fillStyle = `rgba(${Math.round(28 + lanternGlow * 44)},${Math.round(22 + lanternGlow * 30)},${Math.round(20 + lanternGlow * 16)},.92)`;
        ctx.strokeStyle = `rgba(${Math.round(160 + lanternGlow * 60)},${Math.round(120 + lanternGlow * 50)},${Math.round(70 + lanternGlow * 40)},.7)`;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(-signW / 2, -signH / 2, signW, signH, 8 * scale)
          : ctx.rect(-signW / 2, -signH / 2, signW, signH);
        ctx.fill();
        ctx.stroke();
        // Bracket chains
        ctx.strokeStyle = "rgba(90,78,64,.8)";
        ctx.lineWidth = Math.max(1, 1.6 * scale);
        ctx.beginPath();
        ctx.moveTo(-signW * 0.38, -signH / 2);
        ctx.lineTo(-signW * 0.32, -signH / 2 - signH * 0.5);
        ctx.moveTo(signW * 0.38, -signH / 2);
        ctx.lineTo(signW * 0.32, -signH / 2 - signH * 0.5);
        ctx.stroke();

        drawStyledName(ctx, name, 0, 0, {
          style,
          size: signH * 0.52,
          maxWidth: signW * 0.84,
          maxHeight: signH * 0.6,
          minSize: 7,
          language,
          time,
          alpha: clamp(scale * 1.4, 0, 1),
          glow: 0.9,
          paint: (context, { size }) => {
            const gradient = context.createLinearGradient(-size, -size * 0.5, size, size * 0.5);
            gradient.addColorStop(0, `rgba(255,${Math.round(214 + lanternGlow * 30)},${Math.round(160 + lanternGlow * 40)},.95)`);
            gradient.addColorStop(1, `rgba(255,${Math.round(168 + lanternGlow * 40)},${Math.round(96 + lanternGlow * 30)},.9)`);
            return gradient;
          },
          perLetter: ({ index, count, time: now }) => {
            const localGlow = 0.62 + flicker(now * 1.1, index * 3.7, { speed: 1.8 }) * 0.38;
            return { alpha: localGlow * lanternGlow, glow: 0.6 + localGlow * 0.7 };
          }
        });
        ctx.restore();
      }
    }

    drawVignette(ctx, width, height, 0.5);

    const cue = Math.floor(time / 9);
    if (cue !== lastCue) {
      lastCue = cue;
      lanternSide = Math.random() < 0.5 ? -1 : 1;
      if (!preview) emitSound("wind");
    }
  }

  return { resize, frame, destroy() {} };
}
