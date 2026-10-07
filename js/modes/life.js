import { setup2D, TAU } from "./common.js";
import { scaledNameTargets } from "../name-shape.js";

export function createMode({ canvas, shape, showName }) {
  const surface = setup2D(canvas, "#03100e");
  const { ctx } = surface;
  let width = 1, height = 1, cols = 100, rows = 60, cell = 9, current, next, accumulator = 0, generation = 0, lastReset = 0;
  function seed() {
    current = new Uint8Array(cols * rows); next = new Uint8Array(cols * rows);
    if (showName) {
      const targets = scaledNameTargets(shape, width, height, Math.min(1700, cols * rows * .23), .65, .27);
      for (const target of targets) {
        const x = Math.floor(target.x / cell), y = Math.floor(target.y / cell);
        if (x >= 0 && x < cols && y >= 0 && y < rows) current[y * cols + x] = 1;
      }
    }
    for (let i = 0; i < Math.floor(cols * rows * .018); i++) {
      const x = Math.floor(Math.random() * cols), y = Math.floor(Math.random() * rows);
      current[y * cols + x] = 1;
      if (Math.random() < .45) current[y * cols + Math.min(cols - 1, x + 1)] = 1;
    }
    generation = 0; accumulator = 0;
  }
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    cell = Math.max(6, Math.min(11, Math.round(Math.min(w / 135, h / 75))));
    cols = Math.ceil(width / cell); rows = Math.ceil(height / cell); seed();
  }
  function step() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = (x + dx + cols) % cols, ny = (y + dy + rows) % rows;
          neighbors += current[ny * cols + nx];
        }
        const index = y * cols + x;
        next[index] = current[index] ? (neighbors === 2 || neighbors === 3 ? 1 : 0) : (neighbors === 3 ? 1 : 0);
      }
    }
    [current, next] = [next, current]; generation++;
  }
  function frame(dt, time) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= .17 && steps < 3) { step(); accumulator -= .17; steps++; }
    if (generation > 420 || time - lastReset > 22) { seed(); lastReset = time; }
    const bg = ctx.createLinearGradient(0, 0, width, height); bg.addColorStop(0, "#061714"); bg.addColorStop(.56, "#061d19"); bg.addColorStop(1, "#07121a"); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(51,220,143,.07)";
    for (let x = 0; x < cols; x++) { ctx.fillRect(x * cell, 0, 1, height); }
    for (let y = 0; y < rows; y++) { ctx.fillRect(0, y * cell, width, 1); }
    for (let index = 0; index < current.length; index++) {
      if (!current[index]) continue;
      const x = index % cols, y = Math.floor(index / cols);
      const ageTone = (x * 7 + y * 13 + generation) % 40;
      ctx.fillStyle = `rgba(${64 + ageTone},255,${143 + Math.floor(ageTone / 2)},.78)`;
      ctx.shadowColor = "rgba(74,255,164,.85)"; ctx.shadowBlur = 8;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }
    ctx.shadowBlur = 0;
    const scanY = (time * 31) % height;
    const scan = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30); scan.addColorStop(0, "rgba(94,255,175,0)"); scan.addColorStop(.5, "rgba(94,255,175,.06)"); scan.addColorStop(1, "rgba(94,255,175,0)");
    ctx.fillStyle = scan; ctx.fillRect(0, scanY - 30, width, 60);
  }
  return { resize, frame, destroy() {} };
}
