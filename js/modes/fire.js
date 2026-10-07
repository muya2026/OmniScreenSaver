/**
 * A small combustion model.
 *
 * Flames are drawn as temperature, not as shapes. Hot gas is born at the fuel,
 * rises because it is hot, is pushed around by a turbulent curl field, loses
 * heat as it climbs, widens as it cools, and finally stops being visible when
 * it is no longer hot enough to emit. Colour follows temperature through a
 * black-body-ish ramp (white-yellow core, orange body, deep red tips). Sparks
 * are heavier than the gas: they shoot up, stall, then fall as they cool.
 * Smoke is what is left above the flame tip.
 *
 * Rendering uses pre-baked radial sprites drawn additively, so a few hundred
 * particles stay cheap enough to run in nineteen gallery tiles at once.
 */

import { noise2, fbm3, flicker, mulberry32 } from "../motion.js";
import { clamp, TAU } from "./common.js";

/** Cold → hot. Index 0 is the dimmest visible ember, the last is the core. */
const HEAT_RAMP = [
  [92, 26, 14],
  [148, 40, 12],
  [200, 62, 14],
  [232, 92, 18],
  [247, 128, 26],
  [252, 164, 48],
  [255, 198, 92],
  [255, 226, 148],
  [255, 244, 198],
  [255, 252, 236]
];

const EMBER_RAMP = [
  [122, 30, 10],
  [178, 48, 12],
  [226, 84, 20],
  [255, 128, 38],
  [255, 176, 78],
  [255, 214, 138]
];

function makeSprite(size = 72) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  return { canvas, ctx, size };
}

function rampSprites(ramp, size = 72) {
  return ramp.map(([r, g, b]) => {
    const { canvas, ctx } = makeSprite(size);
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gradient.addColorStop(0.32, `rgba(${r},${g},${b},0.62)`);
    gradient.addColorStop(0.68, `rgba(${r},${g},${b},0.18)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  });
}

let FLAME_SPRITES = null;
let EMBER_SPRITES = null;
let SMOKE_SPRITE = null;

function sprites() {
  if (!FLAME_SPRITES) {
    FLAME_SPRITES = rampSprites(HEAT_RAMP, 72);
    EMBER_SPRITES = rampSprites(EMBER_RAMP, 24);
    const { canvas, ctx, size } = makeSprite(96);
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(216,214,222,0.5)");
    gradient.addColorStop(0.5, "rgba(184,182,196,0.22)");
    gradient.addColorStop(1, "rgba(150,150,168,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    SMOKE_SPRITE = canvas;
  }
  return { flames: FLAME_SPRITES, embers: EMBER_SPRITES, smoke: SMOKE_SPRITE };
}

/**
 * @param {object} options
 * @param {number} options.quality  0..1 — particle budget (gallery tiles use less)
 * @param {number} options.seed     deterministic jitter per fire
 */
export function createFire({ quality = 1, seed = 7 } = {}) {
  const { flames, embers, smoke } = sprites();
  const rng = mulberry32(seed * 2654435761);
  const particles = [];
  const sparks = [];
  const puffs = [];

  let x = 0;
  let y = 0;
  let baseWidth = 40;
  let flameHeight = 100;
  let spawnDebt = 0;
  let sparkDebt = 0;
  let puffDebt = 0;
  let heat = 0;
  let light = 0;
  let gust = 0;
  let gustTarget = 0;

  function configure(next) {
    if (typeof next.x === "number") x = next.x;
    if (typeof next.y === "number") y = next.y;
    if (typeof next.baseWidth === "number") baseWidth = Math.max(6, next.baseWidth);
    if (typeof next.flameHeight === "number") flameHeight = Math.max(10, next.flameHeight);
  }

  function spawnParticle(energy = 1) {
    const spread = baseWidth * (0.34 + rng() * 0.5);
    const offset = (rng() * 2 - 1) * spread;
    const heightScale = flameHeight / 100;
    particles.push({
      x: x + offset,
      y: y + (rng() - 0.5) * baseWidth * 0.1,
      vx: (rng() - 0.5) * 26 + gust * 18,
      vy: -(52 + rng() * 46) * heightScale,
      life: 1,
      maxLife: (0.5 + rng() * 0.55) * (0.72 + heightScale * 0.4),
      size: baseWidth * (0.24 + rng() * 0.2),
      seed: rng() * 100,
      energy
    });
  }

  function spawnSpark(burst = 1) {
    const heightScale = flameHeight / 100;
    sparks.push({
      x: x + (rng() - 0.5) * baseWidth * 0.9,
      y: y - flameHeight * (0.1 + rng() * 0.35),
      vx: (rng() - 0.5) * 46 + gust * 30,
      vy: -(120 + rng() * 190) * heightScale * burst,
      life: 1,
      maxLife: 1.1 + rng() * 2.3,
      size: 0.9 + rng() * 1.9,
      seed: rng() * 100,
      spin: rng() * TAU
    });
  }

  function spawnPuff() {
    puffs.push({
      x: x + (rng() - 0.5) * baseWidth * 0.7,
      y: y - flameHeight * (0.85 + rng() * 0.35),
      vx: (rng() - 0.5) * 16 + gust * 22,
      vy: -(26 + rng() * 30),
      life: 1,
      maxLife: 2.6 + rng() * 3.4,
      size: baseWidth * (0.5 + rng() * 0.35),
      seed: rng() * 100
    });
  }

  /**
   * @param {number} dt seconds
   * @param {number} time seconds
   * @param {object} env { wind, intensity, turbulence }
   */
  function update(dt, time, { wind = 0, intensity = 1, turbulence = 1 } = {}) {
    const step = Math.min(dt, 1 / 24);
    const budget = Math.max(0.25, quality);
    const heightScale = flameHeight / 100;

    // Gusts wander on noise, so the flame leans in a believable way.
    gustTarget = wind + fbm3(seed * 0.7, 3.1, time * 0.32, { octaves: 2, seed }) * 0.55 * turbulence;
    gust += (gustTarget - gust) * Math.min(1, step * 2.4);

    const breathe = 0.78 + flicker(time, seed, { speed: 1.15 }) * 0.42;
    spawnDebt += step * 118 * budget * intensity * breathe;
    while (spawnDebt >= 1) { spawnDebt -= 1; spawnParticle(breathe); }

    sparkDebt += step * (7 + flicker(time, seed + 3, { speed: 2.2 }) * 16) * budget * intensity;
    while (sparkDebt >= 1) { sparkDebt -= 1; spawnSpark(0.8 + rng() * 0.6); }

    puffDebt += step * 5.5 * budget * intensity;
    while (puffDebt >= 1) { puffDebt -= 1; spawnPuff(); }

    let heatSum = 0;

    for (let index = particles.length - 1; index >= 0; index--) {
      const p = particles[index];
      p.life -= step / p.maxLife;
      if (p.life <= 0) { particles.splice(index, 1); continue; }
      const t = p.life;                       // 1 at birth → 0 at death
      const heatNow = clamp(t ** 0.72, 0, 1);
      const rise = 1 - t;                     // how far up the flame it is

      // Buoyancy: hot gas accelerates upward, then stalls as it cools.
      p.vy -= (300 * heatNow * p.energy) * heightScale * step;
      p.vy += 96 * (1 - heatNow) * step;      // gravity acting on cooled gas
      p.vx += (x - p.x) * 3.4 * step;         // the column tapers as it rises
      p.vx += gust * 42 * step;

      // Turbulence grows with height: a flame is steady at the base and
      // ragged at the tip.
      const swirl = fbm3(p.x * 0.011, p.y * 0.011, time * 0.55 + p.seed, { octaves: 2, seed: seed + 11 });
      const wobble = (28 + rise * 190) * turbulence;
      p.vx += swirl * wobble * step;
      p.vy += noise2(p.y * 0.02 + p.seed, time * 1.4) * wobble * 0.35 * step;

      const drag = Math.exp(-2.35 * step);
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * step;
      p.y += p.vy * step;

      heatSum += heatNow;
    }

    for (let index = sparks.length - 1; index >= 0; index--) {
      const s = sparks[index];
      s.life -= step / s.maxLife;
      if (s.life <= 0) { sparks.splice(index, 1); continue; }
      const heatNow = clamp(s.life ** 1.25, 0, 1);
      s.vy -= 210 * heatNow * step;           // still rising while hot
      s.vy += 62 * step;                      // then it is just a cinder falling
      s.vx += gust * 60 * step;
      const swirl = fbm3(s.x * 0.008, s.y * 0.008, time * 0.7 + s.seed, { octaves: 2, seed: seed + 23 });
      s.vx += swirl * 130 * turbulence * step;
      s.vy += noise2(s.seed, time * 1.9) * 46 * step;
      const drag = Math.exp(-0.85 * step);
      s.vx *= drag;
      s.vy *= drag;
      s.x += s.vx * step;
      s.y += s.vy * step;
      s.spin += step * 3;
      heatSum += heatNow * 0.15;
    }

    for (let index = puffs.length - 1; index >= 0; index--) {
      const puff = puffs[index];
      puff.life -= step / puff.maxLife;
      if (puff.life <= 0) { puffs.splice(index, 1); continue; }
      const rise = 1 - puff.life;
      puff.vy -= 34 * step * (1 - rise * 0.65);
      puff.vx += gust * 70 * step;
      const swirl = fbm3(puff.x * 0.005, puff.y * 0.005, time * 0.28 + puff.seed, { octaves: 2, seed: seed + 41 });
      puff.vx += swirl * 62 * turbulence * step;
      puff.vy += noise2(puff.seed * 0.5, time * 0.6) * 22 * step;
      const drag = Math.exp(-0.5 * step);
      puff.vx *= drag;
      puff.vy *= drag;
      puff.x += puff.vx * step;
      puff.y += puff.vy * step;
    }

    const targetHeat = clamp(heatSum / Math.max(6, 96 * budget), 0, 2.4);
    heat += (targetHeat - heat) * Math.min(1, step * 6);
    light = clamp((heat * 0.55 + flicker(time, seed + 9, { speed: 1.6 }) * 0.62) / 1.15, 0, 1.35);
  }

  /** Smoke first (behind the flame), then the flame body, then the sparks. */
  function draw(ctx, { smokeAlpha = 1, glow = 1 } = {}) {
    ctx.save();
    if (smokeAlpha > 0.01) {
      for (const puff of puffs) {
        const rise = 1 - puff.life;
        const size = puff.size * (1 + rise * 2.3);
        const alpha = clamp(Math.sin(Math.min(1, rise * 5) * Math.PI * 0.5) * (1 - rise) * 0.16, 0, 1) * smokeAlpha;
        if (alpha <= 0.004) continue;
        ctx.globalAlpha = alpha;
        ctx.drawImage(smoke, puff.x - size, puff.y - size, size * 2, size * 2);
      }
    }
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      const heatNow = clamp(p.life ** 0.72, 0, 1);
      const rise = 1 - p.life;
      const size = p.size * (1 + rise * 1.85);
      const fadeIn = smooth(clamp(rise * 7, 0, 1));
      const alpha = clamp(heatNow * 0.5 * fadeIn, 0, 0.85);
      if (alpha <= 0.004) continue;
      const sprite = flames[Math.min(flames.length - 1, Math.floor(heatNow * flames.length))];
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, p.x - size, p.y - size * 1.25, size * 2, size * 2.5);
    }
    for (const s of sparks) {
      const heatNow = clamp(s.life ** 1.15, 0, 1);
      const twinkle = 0.45 + flicker(s.spin, s.seed, { speed: 2.6 }) * 0.75;
      const sprite = embers[Math.min(embers.length - 1, Math.floor(heatNow * embers.length))];
      const size = s.size * (1.6 + heatNow * 1.6);
      ctx.globalAlpha = clamp(heatNow * twinkle * 0.9, 0, 1);
      ctx.drawImage(sprite, s.x - size, s.y - size, size * 2, size * 2);
    }
    ctx.restore();
  }

  /** Warm light thrown onto the ground and everything standing near it. */
  function drawGlow(ctx, { radius = 260, color = [255, 148, 62], strength = 0.5 } = {}) {
    const level = clamp(light, 0, 1.35);
    const r = radius * (0.82 + level * 0.32);
    const gradient = ctx.createRadialGradient(x, y - flameHeight * 0.2, 1, x, y - flameHeight * 0.2, r);
    const [cr, cg, cb] = color;
    gradient.addColorStop(0, `rgba(${cr},${cg},${cb},${0.5 * strength * level})`);
    gradient.addColorStop(0.35, `rgba(${cr},${cg},${cb},${0.2 * strength * level})`);
    gradient.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y - flameHeight * 0.15, r, r * 0.85, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  return {
    configure,
    update,
    draw,
    drawGlow,
    get light() { return light; },
    get heat() { return heat; },
    get particleCount() { return particles.length + sparks.length + puffs.length; },
    get height() { return flameHeight; },
    set height(value) { flameHeight = Math.max(10, value); },
    get base() { return { x, y, width: baseWidth, height: flameHeight }; }
  };
}

const smooth = t => t * t * (3 - 2 * t);
