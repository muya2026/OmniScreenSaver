import { setup2D, random, drawName, roundedRect, TAU, clamp } from "./common.js";

export function createMode({ canvas, name, showName, emitSound = () => {} }) {
  const surface = setup2D(canvas, "#061017");
  const { ctx } = surface;
  const maskCanvas = showName ? document.createElement("canvas") : null;
  const maskCtx = maskCanvas?.getContext("2d");
  const pipeCanvas = showName ? document.createElement("canvas") : null;
  const pipeCtx = pipeCanvas?.getContext("2d");
  let width = 1, height = 1, pipes = [], motes = [], lastTick = -1;
  const colors = ["#72f3d7", "#71b8ff", "#b8a1ff", "#ffc786"];
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    if (maskCanvas) { maskCanvas.width = Math.max(1, Math.round(w)); maskCanvas.height = Math.max(1, Math.round(h)); }
    if (pipeCanvas) { pipeCanvas.width = Math.max(1, Math.round(w)); pipeCanvas.height = Math.max(1, Math.round(h)); }
    pipes = Array.from({ length: Math.max(18, Math.min(46, Math.floor(w * h / 26000))) }, () => {
      const points = [{ x: random(0, w), y: random(0, h) }];
      let dir = Math.floor(random(0, 4));
      const step = random(36, 95);
      for (let i = 0; i < 7; i++) {
        if (Math.random() < .43) dir = (dir + (Math.random() < .5 ? 1 : 3)) % 4;
        const prev = points.at(-1);
        const vectors = [[step, 0], [0, step], [-step, 0], [0, -step]];
        points.push({ x: clamp(prev.x + vectors[dir][0], -50, w + 50), y: clamp(prev.y + vectors[dir][1], -50, h + 50) });
      }
      return { points, color: colors[Math.floor(random(0, colors.length))], phase: random(0, 1), width: random(4, 8) };
    });
    motes = Array.from({ length: Math.min(100, Math.floor(w * h / 8500)) }, () => ({ x: random(0, w), y: random(0, h), p: random(0, TAU), r: random(1, 3) }));
  }
  function frame(dt, time) {
    const bg = ctx.createLinearGradient(0, 0, width, height); bg.addColorStop(0, "#06131c"); bg.addColorStop(.5, "#111936"); bg.addColorStop(1, "#07101c");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(119,193,198,.08)"; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) { const y = height * i / 7; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    for (const pipe of pipes) {
      const visible = (time * .18 + pipe.phase) % 1;
      const segmentCount = Math.max(1, Math.floor(visible * (pipe.points.length - 1)));
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = pipe.color; ctx.lineWidth = pipe.width; ctx.shadowColor = pipe.color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(pipe.points[0].x, pipe.points[0].y);
      for (let i = 1; i <= segmentCount; i++) ctx.lineTo(pipe.points[i].x, pipe.points[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,.44)"; ctx.lineWidth = Math.max(1, pipe.width * .2); ctx.stroke();
      for (let i = 1; i <= segmentCount; i++) {
        const point = pipe.points[i];
        ctx.fillStyle = "rgba(9,20,32,.9)"; ctx.strokeStyle = pipe.color; ctx.lineWidth = 2;
        roundedRect(ctx, point.x - 6, point.y - 6, 12, 12, 3); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
    for (const mote of motes) {
      mote.p += dt * .7;
      ctx.globalAlpha = .28 + .38 * (Math.sin(mote.p) + 1) / 2;
      ctx.fillStyle = "#a4fff0"; ctx.beginPath(); ctx.arc(mote.x + Math.sin(mote.p) * 3, mote.y, mote.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (showName && maskCtx && pipeCtx) {
      const nameY = height / 2;
      ctx.save(); ctx.globalAlpha = .38; ctx.fillStyle = "rgba(5,13,25,.8)"; roundedRect(ctx, width * .18, height * .38, width * .64, height * .24, 22); ctx.fill();
      ctx.strokeStyle = "rgba(121,237,220,.22)"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      maskCtx.clearRect(0, 0, width, height);
      drawName(maskCtx, name, width / 2, nameY, { maxWidth: width * .56, maxHeight: height * .16, size: 122, color: "#fff", shadow: "transparent", blur: 0 });
      pipeCtx.clearRect(0, 0, width, height);
      const chrome = pipeCtx.createLinearGradient(0, nameY - height * .12, width, nameY + height * .1);
      chrome.addColorStop(0, `hsl(${174 + Math.sin(time * .3) * 18},92%,70%)`); chrome.addColorStop(.45, "#d9fff6"); chrome.addColorStop(.72, "#63cfc9"); chrome.addColorStop(1, "#aaa1ff");
      pipeCtx.fillStyle = chrome; pipeCtx.fillRect(0, 0, width, height);
      pipeCtx.save(); pipeCtx.globalCompositeOperation = "source-over"; pipeCtx.lineCap = "round"; pipeCtx.lineJoin = "round";
      for (const pipe of pipes) {
        const visible = (time * .18 + pipe.phase) % 1;
        const segmentCount = Math.max(1, Math.floor(visible * (pipe.points.length - 1)));
        pipeCtx.strokeStyle = pipe.color; pipeCtx.lineWidth = Math.max(2, pipe.width * .8); pipeCtx.shadowColor = pipe.color; pipeCtx.shadowBlur = 9;
        pipeCtx.beginPath(); pipeCtx.moveTo(pipe.points[0].x, pipe.points[0].y);
        for (let i = 1; i <= segmentCount; i++) pipeCtx.lineTo(pipe.points[i].x, pipe.points[i].y);
        pipeCtx.stroke();
      }
      pipeCtx.restore();
      pipeCtx.globalCompositeOperation = "destination-in"; pipeCtx.drawImage(maskCanvas, 0, 0, width, height); pipeCtx.globalCompositeOperation = "source-over";
      ctx.save(); ctx.shadowColor = "rgba(83,244,224,.65)"; ctx.shadowBlur = 19; ctx.drawImage(pipeCanvas, 0, 0, width, height); ctx.restore();
      drawName(ctx, name, width / 2, nameY, { maxWidth: width * .56, maxHeight: height * .16, size: 122, color: "rgba(236,255,251,.12)", stroke: "rgba(234,255,251,.62)", strokeWidth: 1.2, blur: 8, shadow: "#45ddd1" });
    }
    const tick = Math.floor(time * .8);
    if (tick !== lastTick) { lastTick = tick; if (Math.random() < .28) emitSound("waterDrop"); }
  }
  return { resize, frame, destroy() {} };
}
