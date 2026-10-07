import { splitGraphemes } from "./text.js";

const MASK_WIDTH = 1200;
const MASK_HEIGHT = 300;

export async function createNameShape(name, { language = "en", showName = true, maxPoints = 1400 } = {}) {
  const text = showName ? String(name || "") : "";
  const graphemes = splitGraphemes(text, language);
  if (!text || !graphemes.length) return { points: [], aspect: 3.5, graphemes, text: "" };

  try {
    const fontSample = `বাংলা ${text}`;
    await Promise.all([
      document.fonts.load('700 160px "Baloo Da 2"', fontSample),
      document.fonts.load('400 90px "Hind Siliguri"', fontSample)
    ]);
  } catch {
    // A system Bengali-capable fallback remains available if a local font cannot load.
  }

  const canvas = document.createElement("canvas");
  canvas.width = MASK_WIDTH;
  canvas.height = MASK_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { points: [], aspect: 3.5, graphemes, text };
  context.clearRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
  const fontFamily = '"Baloo Da 2", "Hind Siliguri", sans-serif';
  let fontSize = 190;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${fontSize}px ${fontFamily}`;
  let measured = context.measureText(text);
  while (fontSize > 52 && (measured.width > MASK_WIDTH * 0.9 || fontSize > MASK_HEIGHT * 0.75)) {
    fontSize -= 4;
    context.font = `700 ${fontSize}px ${fontFamily}`;
    measured = context.measureText(text);
  }
  const drawWidth = Math.min(MASK_WIDTH * 0.9, measured.width);
  context.fillStyle = "#fff";
  context.fillText(text, MASK_WIDTH / 2, MASK_HEIGHT / 2, MASK_WIDTH * 0.9);

  const pixels = context.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data;
  const rough = [];
  const step = 4;
  for (let y = 0; y < MASK_HEIGHT; y += step) {
    for (let x = 0; x < MASK_WIDTH; x += step) {
      const alpha = pixels[(y * MASK_WIDTH + x) * 4 + 3];
      if (alpha > 92) rough.push({
        x: (x - MASK_WIDTH / 2) / MASK_WIDTH,
        y: (y - MASK_HEIGHT / 2) / MASK_HEIGHT,
        alpha: alpha / 255
      });
    }
  }
  const stride = Math.max(1, Math.ceil(rough.length / maxPoints));
  const sampled = rough.filter((_, index) => index % stride === 0).slice(0, maxPoints);
  const xs = sampled.map(point => point.x);
  const ys = sampled.map(point => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  const points = sampled.map(point => ({
    x: (point.x - (minX + maxX) / 2) / spanX,
    y: (point.y - (minY + maxY) / 2) / spanY,
    alpha: point.alpha
  }));
  return { points, aspect: Math.max(0.4, spanX / spanY), graphemes, text };
}

export function scaledNameTargets(shape, width, height, count = 240, maxWidthRatio = 0.58, maxHeightRatio = 0.3) {
  if (!shape?.points?.length || count < 1) return [];
  const points = shape.points;
  const stride = Math.max(1, Math.floor(points.length / count));
  const aspect = Math.max(0.4, shape.aspect || 1);
  const targetWidth = Math.min(width * maxWidthRatio, height * maxHeightRatio * aspect);
  const targetHeight = Math.min(height * maxHeightRatio, targetWidth / aspect);
  const targets = [];
  for (let index = 0; index < points.length && targets.length < count; index += stride) {
    const point = points[index];
    targets.push({ x: width / 2 + point.x * targetWidth, y: height / 2 + point.y * targetHeight });
  }
  return targets;
}
