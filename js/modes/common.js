export const TAU = Math.PI * 2;
export const DISPLAY_FONT = '"Baloo Da 2", "Hind Siliguri", sans-serif';
export const UI_FONT = '"Hind Siliguri", system-ui, sans-serif';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const random = (min = 0, max = 1) => min + Math.random() * (max - min);
export const pick = items => items[Math.floor(Math.random() * items.length)];
export const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function setup2D(canvas, background = "#050713") {
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  let width = 1;
  let height = 1;
  let ratio = 1;
  function resize(nextWidth = innerWidth, nextHeight = innerHeight, pixelRatio = Math.min(2, devicePixelRatio || 1)) {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    ratio = Math.min(2, Math.max(1, pixelRatio || 1));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  return { ctx, get width() { return width; }, get height() { return height; }, get ratio() { return ratio; }, resize };
}

export function fontSizeToFit(ctx, text, maxWidth, maxHeight, base = 160, min = 20, family = DISPLAY_FONT, weight = 700) {
  if (!text) return min;
  let size = base;
  ctx.font = `${weight} ${size}px ${family}`;
  let measured = ctx.measureText(text).width;
  const scale = Math.min(1, maxWidth / Math.max(1, measured), maxHeight / size);
  size = Math.max(min, size * scale);
  return size;
}

export function drawName(ctx, text, x, y, options = {}) {
  if (!text || options.hidden) return;
  const {
    maxWidth = 850,
    maxHeight = 180,
    size = 160,
    minSize = 20,
    family = DISPLAY_FONT,
    weight = 700,
    color = "#f5f3ff",
    shadow = "rgba(178,147,255,.9)",
    blur = 22,
    stroke = null,
    strokeWidth = 2,
    align = "center",
    baseline = "middle",
    alpha = 1,
    scaleX = 1,
    rotate = 0,
    letterSpacing = 0
  } = options;
  const fitSize = fontSizeToFit(ctx, text, maxWidth, maxHeight, size, minSize, family, weight);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rotate) ctx.rotate(rotate);
  if (scaleX !== 1) ctx.scale(scaleX, 1);
  ctx.font = `${weight} ${fitSize}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  ctx.shadowColor = shadow;
  ctx.shadowBlur = blur;
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, 0, 0, maxWidth);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0, maxWidth);
  ctx.restore();
  return fitSize;
}

export function roundedRect(ctx, x, y, width, height, radius = 8) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, width, height, r) : (
    ctx.moveTo(x + r, y), ctx.lineTo(x + width - r, y), ctx.quadraticCurveTo(x + width, y, x + width, y + r),
    ctx.lineTo(x + width, y + height - r), ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height),
    ctx.lineTo(x + r, y + height), ctx.quadraticCurveTo(x, y + height, x, y + height - r),
    ctx.lineTo(x, y + r), ctx.quadraticCurveTo(x, y, x + r, y), ctx.closePath()
  );
}

export function createStars(count, width, height, speed = 1) {
  return Array.from({ length: count }, () => ({
    x: random(-width / 2, width / 2),
    y: random(-height / 2, height / 2),
    z: random(0.08, 1),
    size: random(0.4, 1.7),
    speed: random(0.1, 1) * speed,
    twinkle: random(0, TAU)
  }));
}

export function drawStars(ctx, stars, width, height, time, centerX = width / 2, centerY = height / 2, warp = 0) {
  for (const star of stars) {
    star.z -= star.speed * (0.002 + warp * 0.018);
    if (star.z <= 0.02) {
      star.x = random(-width / 2, width / 2);
      star.y = random(-height / 2, height / 2);
      star.z = 1;
      star.speed = random(0.1, 1);
    }
    const perspective = 1 / star.z;
    const x = centerX + star.x * perspective;
    const y = centerY + star.y * perspective;
    if (x < -30 || x > width + 30 || y < -30 || y > height + 30) continue;
    const radius = Math.max(0.4, star.size * perspective * 0.65);
    const alpha = clamp(0.25 + Math.sin(time * 2 + star.twinkle) * 0.2 + warp * 0.45, 0.1, 0.95);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.twinkle % 3 > 1.5 ? "#c9f8ff" : "#ded3ff";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    if (warp > 0.1) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = radius * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(centerX + (x - centerX) * (1 + warp * 0.16), centerY + (y - centerY) * (1 + warp * 0.16));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawGlowDot(ctx, x, y, radius, color, blur = 12, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawGroundGrid(ctx, width, height, horizon, time, color = "rgba(88,239,218,.62)") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 7;
  for (let index = 0; index < 13; index++) {
    const x = (index / 12) * width;
    ctx.beginPath();
    ctx.moveTo(width / 2 + (x - width / 2) * 0.025, horizon);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  const phase = (time * 0.7) % 1;
  for (let index = 0; index < 19; index++) {
    const p = ((index / 18 + phase) % 1) ** 2;
    const y = horizon + p * (height - horizon);
    ctx.globalAlpha = 0.16 + p * 0.72;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPine(ctx, x, groundY, height, color = "#071c23", sway = 0) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - height * 0.14, groundY);
  ctx.lineTo(x + sway, groundY - height);
  ctx.lineTo(x + height * 0.14, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - height * 0.12, groundY - height * 0.22);
  ctx.lineTo(x + sway, groundY - height * 1.13);
  ctx.lineTo(x + height * 0.12, groundY - height * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function rgba(hex, alpha = 1) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map(part => part + part).join("") : value;
  const number = Number.parseInt(full, 16);
  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},${alpha})`;
}
