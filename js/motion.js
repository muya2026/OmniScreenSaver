/**
 * Shared motion primitives.
 *
 * Every world in OmniScreenSaver pulls its motion from here so that nothing
 * moves in straight, mechanical lines. The building blocks are small on
 * purpose: a seeded value noise, fractal sums of that noise, curl fields for
 * fluid-like drift, springs for weight, and integrators that apply gravity,
 * drag and buoyancy the way real air and water do.
 */

export const TAU = Math.PI * 2;

/** Deterministic 32-bit PRNG so a scene can be rebuilt identically. */
export function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = t => t * t * (3 - 2 * t);
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

/** Cheap integer hash used by the noise field. */
function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 1274126177;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hash3(x, y, z, seed) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647 + seed * 1274126177;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise in the range -1..1. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = fade(xf);
  const v = fade(yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const top = a + (b - a) * u;
  const bottom = c + (d - c) * u;
  return (top + (bottom - top) * v) * 2 - 1;
}

/** Smooth 3D value noise in the range -1..1 (the third axis is usually time). */
export function noise3(x, y, z, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);
  const c000 = hash3(xi, yi, zi, seed);
  const c100 = hash3(xi + 1, yi, zi, seed);
  const c010 = hash3(xi, yi + 1, zi, seed);
  const c110 = hash3(xi + 1, yi + 1, zi, seed);
  const c001 = hash3(xi, yi, zi + 1, seed);
  const c101 = hash3(xi + 1, yi, zi + 1, seed);
  const c011 = hash3(xi, yi + 1, zi + 1, seed);
  const c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
  const x00 = c000 + (c100 - c000) * u;
  const x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u;
  const x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return (y0 + (y1 - y0) * w) * 2 - 1;
}

/** Fractal (summed octave) noise. Returns roughly -1..1. */
export function fbm2(x, y, { octaves = 4, lacunarity = 2.03, gain = 0.5, seed = 0 } = {}) {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let index = 0; index < octaves; index++) {
    sum += noise2(x * frequency, y * frequency, seed + index * 17) * amplitude;
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / Math.max(1e-6, norm);
}

/** Fractal noise with a time axis. */
export function fbm3(x, y, z, { octaves = 3, lacunarity = 2.05, gain = 0.5, seed = 0 } = {}) {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let index = 0; index < octaves; index++) {
    sum += noise3(x * frequency, y * frequency, z * frequency, seed + index * 23) * amplitude;
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / Math.max(1e-6, norm);
}

/**
 * Divergence-free (curl) flow field. Particles following this swirl and
 * braid instead of marching along parallel lines.
 */
export function curl2(x, y, time, { epsilon = 0.0001, scale = 1, seed = 0, strength = 1 } = {}) {
  const sx = x * scale;
  const sy = y * scale;
  const sz = time * scale;
  const n1 = fbm3(sx, sy + epsilon, sz, { seed, octaves: 2 });
  const n2 = fbm3(sx, sy - epsilon, sz, { seed, octaves: 2 });
  const n3 = fbm3(sx + epsilon, sy, sz, { seed, octaves: 2 });
  const n4 = fbm3(sx - epsilon, sy, sz, { seed, octaves: 2 });
  const dy = (n1 - n2) / (2 * epsilon);
  const dx = (n3 - n4) / (2 * epsilon);
  const length = Math.hypot(dx, dy) || 1;
  return { x: (dy / length) * strength, y: (-dx / length) * strength };
}

/** Angle (radians) of a turbulent flow field, ready for `Math.cos/sin`. */
export function flowAngle(x, y, time, { scale = 0.0022, speed = 0.12, seed = 0, swirl = 2.4 } = {}) {
  return fbm3(x * scale, y * scale, time * speed, { seed, octaves: 3 }) * Math.PI * swirl;
}

/**
 * Firelight: a fast, irregular flicker that never repeats cleanly.
 * Returns roughly 0..1.
 */
export function flicker(time, seed = 0, { speed = 1, irregular = 0.55 } = {}) {
  const t = time * speed;
  const slow = noise2(t * 0.9, seed * 3.1, seed) * 0.5 + 0.5;
  const fast = noise2(t * 5.4 + 11.3, seed * 7.7 + 4.2, seed + 5) * 0.5 + 0.5;
  const breath = 0.5 + 0.5 * Math.sin(t * 1.7 + seed);
  const mixed = slow * 0.44 + fast * irregular * 0.4 + breath * 0.16;
  return Math.min(1, Math.max(0, mixed));
}

/** Critically damped spring. `follow` returns the eased value. */
export class Spring {
  constructor(value = 0, { stiffness = 120, damping = 18, mass = 1 } = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
  }
  set(value) { this.value = value; this.target = value; this.velocity = 0; return this; }
  to(target) { this.target = target; return this; }
  step(dt) {
    const step = Math.min(dt, 1 / 30);
    const force = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
    this.velocity += (force / this.mass) * step;
    this.value += this.velocity * step;
    return this.value;
  }
}

/** Frame-rate independent exponential approach (`tau` = seconds to ~63%). */
export function damp(current, target, tau, dt) {
  if (tau <= 0) return target;
  return target + (current - target) * Math.exp(-dt / tau);
}

/**
 * Advance a particle with buoyancy, gravity, drag and turbulence.
 * Hot things rise and cool off; heavy things fall. Air resistance is applied
 * as a velocity-squared style damping so embers slow as they climb.
 */
export function integrate(body, dt, {
  gravity = 0,
  buoyancy = 0,
  drag = 0.6,
  turbulence = 0,
  time = 0,
  scale = 0.002,
  seed = 0
} = {}) {
  body.vy += (gravity - buoyancy) * dt;
  if (turbulence > 0) {
    const angle = flowAngle(body.x, body.y, time, { scale, seed });
    body.vx += Math.cos(angle) * turbulence * dt;
    body.vy += Math.sin(angle) * turbulence * dt * 0.7;
  }
  const decay = Math.exp(-drag * dt);
  body.vx *= decay;
  body.vy *= decay;
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  return body;
}

/** Sum of travelling sine waves — the basis of every water surface here. */
export function waveHeight(x, time, {
  amplitude = 8,
  wavelength = 220,
  speed = 1.1,
  octaves = 3,
  seed = 0
} = {}) {
  let height = 0;
  let amp = amplitude;
  let length = wavelength;
  let phase = seed;
  for (let index = 0; index < octaves; index++) {
    const k = (Math.PI * 2) / length;
    height += Math.sin(x * k + time * speed * k * length * 0.5 + phase) * amp;
    height += noise2(x / length + index * 4.7, time * 0.35 + index, seed + index) * amp * 0.35;
    amp *= 0.52;
    length *= 0.55;
    phase += 1.7;
  }
  return height;
}

export const easeOutCubic = t => 1 - (1 - t) ** 3;
export const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
export const easeOutElastic = t => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 2 ** (-9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

/** Gentle, always-changing drift for cameras, signs and hanging things. */
export function drift(time, seed = 0, { speed = 0.22, amount = 1 } = {}) {
  return (fbm3(seed * 3.7, seed * 1.9, time * speed, { octaves: 2, seed }) * amount);
}
