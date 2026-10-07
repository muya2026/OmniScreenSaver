import { setup2D, TAU, clamp, rgba, drawStyledName, drawVignette, makeStarField, drawTwinklingStars } from "./common.js";
import { typeStyle } from "./type-styles.js";
import { fbm3 } from "../motion.js";

/**
 * 3D Spinning Name.
 *
 * Solid chrome lettering turning slowly in space. The extrusion is drawn as a
 * stack of slices behind the face, each letter lags a fraction behind its
 * neighbour so the word ripples as it turns, and a specular band sweeps across
 * the metal. A soft shadow keeps it sitting in front of the star field.
 */
export function createMode({ canvas, name, language = "en", showName, preview = false }) {
  const surface = setup2D(canvas, "#060817");
  const { ctx } = surface;
  const style = typeStyle("spin");
  let width = 1;
  let height = 1;
  let stars = [];

  function resize(w, h, ratio) {
    surface.resize(w, h, ratio);
    width = w;
    height = h;
    stars = makeStarField(preview ? 40 : 130, w, h, { topRatio: 1, seed: 4 });
  }

  function frame(dt, time) {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#070c1e");
    bg.addColorStop(0.5, "#161334");
    bg.addColorStop(1, "#060d1c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    drawTwinklingStars(ctx, stars, time, { color: "#cfdcff", base: 0.22 });

    const centerX = width / 2;
    const centerY = height / 2;

    if (!showName) {
      const radius = Math.min(width, height) * 0.16;
      const angle = time * 0.6;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.strokeStyle = "rgba(176,208,255,.7)";
      ctx.lineWidth = 2;
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * Math.abs(Math.cos(angle)) * (1 - ring * 0.22), radius, ring * 0.7, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      drawVignette(ctx, width, height, 0.4);
      return;
    }

    const angle = time * 0.42 + fbm3(time * 0.06, 2.8, 0, { octaves: 2, seed: 14 }) * 0.18;
    const face = Math.cos(angle);
    const size = Math.min(height * 0.24, width * 0.11);
    const depthLayers = preview ? 8 : 16;

    // Shadow on the floor of the scene
    ctx.save();
    ctx.translate(centerX, centerY + size * 0.72);
    ctx.scale(1, 0.22);
    const shadow = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 1.6);
    shadow.addColorStop(0, `rgba(4,6,18,${0.42 + Math.abs(face) * 0.18})`);
    shadow.addColorStop(1, "rgba(4,6,18,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Extruded body
    for (let depth = depthLayers; depth >= 1; depth--) {
      const shade = 0.1 + (depth / depthLayers) * 0.22;
      drawStyledName(ctx, name, centerX + Math.sin(angle) * depth * 1.15, centerY + depth * 0.95, {
        style,
        size,
        maxWidth: width * 0.74,
        maxHeight: height * 0.28,
        minSize: 14,
        language,
        time,
        alpha: 1,
        effects: [],
        shadowBlur: 0,
        paint: `rgba(${Math.round(24 + shade * 90)},${Math.round(30 + shade * 96)},${Math.round(68 + shade * 110)},1)`,
        perLetter: ({ index, time: now }) => {
          const letterAngle = angle + index * 0.16 + Math.sin(now * 0.6 + index) * 0.05;
          return { scaleX: Math.max(0.05, Math.abs(Math.cos(letterAngle))), rotate: 0 };
        }
      });
    }

    // Front face
    drawStyledName(ctx, name, centerX, centerY, {
      style,
      size,
      maxWidth: width * 0.74,
      maxHeight: height * 0.28,
      minSize: 14,
      language,
      time,
      alpha: 1,
      glow: 1.1,
      stroke: "rgba(255,255,255,.62)",
      strokeWidth: 0.9,
      paint: (context, { size: letterSize, index, time: now }) => {
        const sweep = ((now * 0.35 + index * 0.08) % 1.6) - 0.3;
        const gradient = context.createLinearGradient(-letterSize, -letterSize * 0.6, letterSize * 1.6, letterSize * 0.6);
        gradient.addColorStop(clamp(sweep - 0.18, 0, 1), face >= 0 ? "#7fb8ff" : "#ffc0e6");
        gradient.addColorStop(clamp(sweep, 0.001, 0.999), "#ffffff");
        gradient.addColorStop(clamp(sweep + 0.18, 0, 1), face >= 0 ? "#d9c6ff" : "#a8c8ff");
        return gradient;
      },
      perLetter: ({ index, time: now }) => {
        const letterAngle = angle + index * 0.16 + Math.sin(now * 0.6 + index) * 0.05;
        const scaleX = Math.max(0.06, Math.abs(Math.cos(letterAngle)));
        const side = Math.cos(letterAngle) >= 0 ? 1 : -1;
        return {
          scaleX: scaleX * side,
          glow: 0.6 + Math.abs(Math.cos(letterAngle)) * 0.6
        };
      }
    });

    // Glint travelling across the metal
    const glint = ((time * 0.24) % 1.6) - 0.3;
    if (glint > -0.1 && glint < 1.1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.16;
      ctx.translate(centerX, centerY);
      ctx.rotate(-0.32);
      const band = ctx.createLinearGradient(-size * 3 + glint * size * 6, 0, -size * 2 + glint * size * 6, 0);
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.5, "rgba(255,255,255,.9)");
      band.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = band;
      ctx.fillRect(-size * 4, -size * 1.2, size * 8, size * 2.4);
      ctx.restore();
    }

    drawVignette(ctx, width, height, 0.42);
  }

  return { resize, frame, destroy() {} };
}
