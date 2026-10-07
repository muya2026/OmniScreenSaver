import {
  setup2D, TAU, clamp, random, smoothstep, rgba,
  drawStyledName, drawVignette
} from "./common.js";
import { typeStyle } from "./type-styles.js";
import { scaledNameTargets } from "../name-shape.js";
import { fbm3, noise2, easeOutCubic } from "../motion.js";

/**
 * Starfield Warp.
 *
 * Stars drift in three dimensions while the field breathes; every so often the
 * ship engages, the field stretches, and the stars gather — each with its own
 * reaction time — into the wide-set lettering of the name. Then they let go.
 */
export function createMode({ canvas, name, shape, language = "en", showName, emitSound = () => {}, preview = false }) {
  const surface = setup2D(canvas, "#030610");
  const { ctx } = surface;
  const style = typeStyle("starfield");
  let stars = [];
  let namePoints = [];
  let lastCycle = -1;
  let scatter = 0;

  function resize(width, height, ratio) {
    surface.resize(width, height, ratio);
    const count = Math.round(Math.min(preview ? 90 : 620, Math.max(40, (width * height) / (preview ? 5200 : 2300))));
    stars = Array.from({ length: count }, () => ({
      x: random(-width / 2, width / 2),
      y: random(-height / 2, height / 2),
      z: random(0.06, 1),
      r: random(0.35, 1.9),
      hue: random(178, 280),
      speed: random(0.35, 1.15),
      delay: random(0, 0.55),
      twinkle: random(0, TAU)
    }));
    namePoints = showName
      ? scaledNameTargets(shape, width, height, preview ? 120 : 420, 0.6, preview ? 0.34 : 0.24)
      : [];
  }

  function frame(dt, time) {
    const { width, height } = surface;
    const cx = width / 2;
    const cy = height / 2;
    const cycle = time % 17;
    // Warp envelope: a smooth surge rather than an on/off switch
    const surge = clamp(noise2(time * 0.12, 4.2) * 0.5 + 0.5, 0, 1);
    const warp = cycle < 1.4
      ? smoothstep(0, 1.4, cycle) * 0.34
      : cycle < 5.2
        ? 0.34 * (0.72 + surge * 0.38)
        : cycle < 8.4
          ? 0.34 * (1 - smoothstep(5.2, 8.4, cycle))
          : 0.02;
    const gather = showName ? smoothstep(3.6, 6.9, cycle) * (1 - smoothstep(12.4, 15.2, cycle)) : 0;

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#060a1a");
    bg.addColorStop(0.5, "#0e1230");
    bg.addColorStop(1, "#030611");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // A faint nebula so the void is not flat black
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.1;
    const nebula = ctx.createRadialGradient(width * 0.68, height * 0.32, 4, width * 0.68, height * 0.32, Math.max(width, height) * 0.55);
    nebula.addColorStop(0, rgba("#6b4bd6", 0.5));
    nebula.addColorStop(0.5, rgba("#2b3f8f", 0.25));
    nebula.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    for (let index = 0; index < stars.length; index++) {
      const star = stars[index];
      star.z -= dt * (0.05 + star.z * 0.26 + warp * 1.35);
      if (star.z < 0.035) {
        star.x = random(-width / 2, width / 2);
        star.y = random(-height / 2, height / 2);
        star.z = 1;
        star.speed = random(0.35, 1.15);
        star.delay = random(0, 0.55);
      }
      const scale = 1 / star.z;
      let sx = cx + star.x * scale;
      let sy = cy + star.y * scale;
      const radius = Math.min(5.5, star.r * scale * 0.5);
      let alpha = clamp(0.18 + (1 - star.z) * 0.7, 0.08, 0.95) * (0.7 + 0.3 * Math.sin(time * 1.6 + star.twinkle));

      if (gather > 0.001 && namePoints.length) {
        const local = easeOutCubic(clamp((gather - star.delay * 0.5) / (1 - star.delay * 0.5), 0, 1));
        const target = namePoints[index % namePoints.length];
        const wobble = fbm3(target.x * 0.01, target.y * 0.01, time * 0.35, { octaves: 2, seed: index }) * 2.2;
        sx += (target.x + wobble - sx) * local;
        sy += (target.y + wobble * 0.7 - sy) * local;
        alpha = Math.max(alpha, local * 0.95);
      } else if (scatter > 0.001) {
        const angle = Math.atan2(sy - cy, sx - cx);
        const push = scatter * 90 * (0.4 + (1 - star.z));
        sx += Math.cos(angle) * push;
        sy += Math.sin(angle) * push;
      }

      if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;
      ctx.globalAlpha = alpha * (1 - gather * 0.25);
      ctx.fillStyle = `hsl(${star.hue} 84% 86%)`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, TAU);
      ctx.fill();
      if (warp > 0.16) {
        const trail = 1 + warp * 0.55;
        ctx.strokeStyle = `hsla(${star.hue} 88% 78% / ${alpha * warp * 1.5})`;
        ctx.lineWidth = Math.max(0.4, radius * 0.62);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx + (sx - cx) * trail, cy + (sy - cy) * trail);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    scatter = Math.max(0, scatter - dt * 1.6);
    if (showName && gather > 0.05) {
      drawStyledName(ctx, name, cx, cy, {
        style,
        size: Math.min(height * 0.2, width * 0.11),
        maxWidth: width * 0.78,
        maxHeight: height * 0.26,
        minSize: 12,
        language,
        time,
        alpha: smoothstep(0.15, 0.8, gather) * 0.95,
        glow: 1.2,
        paint: (context, { size }) => {
          const gradient = context.createLinearGradient(-size * 3, 0, size * 4, size * 0.4);
          gradient.addColorStop(0, "#a9e7ff");
          gradient.addColorStop(0.45, "#f0eaff");
          gradient.addColorStop(1, "#cfa6ff");
          return gradient;
        },
        stroke: "rgba(190,224,255,.55)",
        strokeWidth: 1,
        perLetter: ({ index, count, progress, time: now }) => {
          const delay = (index / Math.max(1, count)) * 0.45;
          const local = clamp((progress - delay) / 0.55, 0, 1);
          const shimmer = 0.82 + noise2(index * 2.7, now * 1.4) * 0.24;
          return {
            scaleX: 1.35 - local * 0.35,
            alpha: local * shimmer,
            glow: 0.7 + local * 0.6
          };
        },
        progress: gather
      });
    }

    drawVignette(ctx, width, height, 0.44);

    const currentCycle = Math.floor(time / 17);
    if (currentCycle !== lastCycle && cycle < 0.25) {
      lastCycle = currentCycle;
      scatter = 1;
      emitSound("whoosh");
    }
  }

  return { resize, frame, destroy() {} };
}
