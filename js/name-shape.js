import { splitGraphemes } from "./text.js";
import { TYPE_STYLES, loadTypeStyle } from "./modes/type-styles.js";

const MASK_WIDTH = 1100;
const MASK_HEIGHT = 280;
const cache = new Map();
const pending = new Map();
const MAX_CACHED_SHAPES = 32;

function getCachedShape(key) {
  if (!cache.has(key)) return null;
  const shape = cache.get(key);
  cache.delete(key);
  cache.set(key, shape);
  return shape;
}

function rememberShape(key, shape) {
  cache.delete(key);
  cache.set(key, shape);
  while (cache.size > MAX_CACHED_SHAPES) cache.delete(cache.keys().next().value);
}

/** Distinct typeface/weight/tracking treatments used across the gallery. */
export function distinctTypeStyles() {
  const seen = new Map();
  for (const [id, style] of Object.entries(TYPE_STYLES)) {
    const key = `${style.weight}|${style.family}|${style.tracking || 0}`;
    if (!seen.has(key)) {
      seen.set(key, { key, weight: style.weight, family: style.family, tracking: style.tracking || 0, ids: [] });
    }
    seen.get(key).ids.push(id);
  }
  return [...seen.values()];
}

export function shapeKeyFor(style, text, language) {
  return `${style.weight}|${style.family}|${style.tracking || 0}|${language}|${text}`;
}

async function buildShape(text, { language, style, maxPoints }) {
  const fontFamily = style.family;
  const weight = style.weight;
  await loadTypeStyle(style, `বাংলা ${text}`);

  const canvas = document.createElement("canvas");
  canvas.width = MASK_WIDTH;
  canvas.height = MASK_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { points: [], aspect: 3.5, graphemes: splitGraphemes(text, language), text };

  context.clearRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
  context.textAlign = "center";
  context.textBaseline = "middle";
  const clusters = splitGraphemes(text, language);
  let fontSize = Math.min(210, MASK_HEIGHT * 0.78);
  context.font = `${weight} ${fontSize}px ${fontFamily}`;
  let measured = context.measureText(text);
  while (fontSize > 46 && measured.width + (style.tracking || 0) * fontSize * Math.max(0, clusters.length - 1) > MASK_WIDTH * 0.9) {
    fontSize -= 5;
    context.font = `${weight} ${fontSize}px ${fontFamily}`;
    measured = context.measureText(text);
  }

  // Track the clusters out by hand so wide letterspacing is part of the mask.
  const widths = clusters.map(cluster => context.measureText(cluster).width);
  const gap = (style.tracking || 0) * fontSize;
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, clusters.length - 1);
  let cursor = MASK_WIDTH / 2 - totalWidth / 2;
  context.fillStyle = "#fff";
  for (let index = 0; index < clusters.length; index++) {
    context.fillText(clusters[index], cursor + widths[index] / 2, MASK_HEIGHT / 2);
    cursor += widths[index] + gap;
  }

  const pixels = context.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data;
  const step = Math.max(2, Math.round(fontSize / 42));
  const rough = [];
  for (let y = 0; y < MASK_HEIGHT; y += step) {
    for (let x = 0; x < MASK_WIDTH; x += step) {
      const index = (y * MASK_WIDTH + x) * 4 + 3;
      const alpha = pixels[index];
      if (alpha > 88) {
        rough.push({
          x: (x - MASK_WIDTH / 2) / MASK_WIDTH,
          y: (y - MASK_HEIGHT / 2) / MASK_HEIGHT,
          alpha: alpha / 255
        });
      }
    }
  }
  const stride = Math.max(1, Math.ceil(rough.length / maxPoints));
  const sampled = rough.filter((_, index) => index % stride === 0).slice(0, maxPoints);
  if (!sampled.length) return { points: [], aspect: 3.5, graphemes: clusters, text };
  const xs = sampled.map(point => point.x);
  const ys = sampled.map(point => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1e-4, maxX - minX);
  const spanY = Math.max(1e-4, maxY - minY);
  const points = sampled.map(point => ({
    x: (point.x - (minX + maxX) / 2) / spanX,
    y: (point.y - (minY + maxY) / 2) / spanY,
    alpha: point.alpha
  }));
  return { points, aspect: Math.max(0.4, spanX / spanY), graphemes: clusters, text };
}

/**
 * Build (or reuse) the point cloud for a name in a given type style.
 * Shapes are cached per typeface/weight/language so each named particle world
 * can use its own lettering without re-sampling the canvas. The cache is LRU
 * bounded because people may try many names in one session.
 */
export async function createNameShape(name, { language = "en", showName = true, style = TYPE_STYLES.starfield, maxPoints = 1400 } = {}) {
  const text = showName ? String(name || "") : "";
  const graphemes = splitGraphemes(text, language);
  if (!text || !graphemes.length) return { points: [], aspect: 3.5, graphemes, text: "" };
  const key = shapeKeyFor(style, text, language);
  const cached = getCachedShape(key);
  if (cached) return cached;
  if (pending.has(key)) return pending.get(key);
  const promise = buildShape(text, { language, style, maxPoints })
    .then(shape => { rememberShape(key, shape); pending.delete(key); return shape; })
    .catch(() => {
      pending.delete(key);
      return { points: [], aspect: 3.5, graphemes, text };
    });
  pending.set(key, promise);
  return promise;
}

export function peekNameShape(style, text, language) {
  return cache.get(shapeKeyFor(style, text, language)) || null;
}

export function clearNameShapeCache() {
  cache.clear();
  pending.clear();
}

export function scaledNameTargets(shape, width, height, count = 240, maxWidthRatio = 0.58, maxHeightRatio = 0.3, offset = { x: 0, y: 0 }) {
  if (!shape?.points?.length || count < 1) return [];
  const points = shape.points;
  const stride = Math.max(1, Math.floor(points.length / count));
  const aspect = Math.max(0.4, shape.aspect || 1);
  const targetWidth = Math.min(width * maxWidthRatio, height * maxHeightRatio * aspect);
  const targetHeight = Math.min(height * maxHeightRatio, targetWidth / aspect);
  const targets = [];
  for (let index = 0; index < points.length && targets.length < count; index += stride) {
    const point = points[index];
    targets.push({
      x: width / 2 + point.x * targetWidth + offset.x,
      y: height / 2 + point.y * targetHeight + offset.y,
      alpha: point.alpha
    });
  }
  return targets;
}
