import { setup2D, random, roundedRect } from "./common.js";

export function createMode({ canvas, name, language, showName }) {
  const surface = setup2D(canvas, "#080e1c");
  const { ctx } = surface;
  const pixelCanvas = document.createElement("canvas"); pixelCanvas.width = 400; pixelCanvas.height = 225;
  const px = pixelCanvas.getContext("2d");
  let width = 1, height = 1, stars = [];
  function resize(w, h, ratio) { surface.resize(w, h, ratio); width = w; height = h; stars = Array.from({ length: 55 }, () => ({ x: random(0, 400), y: random(0, 135), phase: random(0, 8) })); }
  function block(x, y, w, h, color) { px.fillStyle = color; px.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function frame(dt, time) {
    const p = px; p.fillStyle = "#111a34"; p.fillRect(0, 0, 400, 225);
    const sky = p.createLinearGradient(0, 0, 0, 170); sky.addColorStop(0, "#111a36"); sky.addColorStop(1, "#4a3150"); p.fillStyle = sky; p.fillRect(0, 0, 400, 173);
    for (const star of stars) { const bright = Math.sin(time * 1.1 + star.phase) > .15; if (bright) block(star.x, star.y, 2, 2, "#dce9ff"); }
    // Low, blocky moonlight
    block(315, 27, 21, 21, "#eedfce"); block(319, 23, 13, 4, "#eedfce"); block(311, 31, 4, 13, "#eedfce"); block(327, 31, 4, 13, "#eedfce");
    // Distant pixel hills
    block(0, 131, 64, 22, "#1c2741"); block(64, 124, 58, 29, "#1c2741"); block(122, 137, 68, 16, "#202641"); block(190, 121, 78, 32, "#1c2741"); block(268, 136, 58, 17, "#202641"); block(326, 126, 74, 27, "#1c2741");
    block(0, 151, 400, 74, "#182331"); block(0, 167, 400, 4, "#31454a");
    // Tent, in chunky pixel-art planes
    block(50, 126, 61, 4, "#bd6f63"); block(57, 119, 47, 7, "#c88069"); block(65, 111, 31, 8, "#d39778"); block(74, 104, 14, 7, "#e0ae86");
    block(64, 130, 34, 23, "#a45856"); block(75, 136, 12, 17, "#182331"); block(67, 132, 27, 3, "#f2c389");
    // Pine trees
    for (const [x, y, c] of [[18, 132, "#142e2d"], [34, 137, "#193a34"], [121, 133, "#142e2d"], [143, 140, "#193a34"], [353, 134, "#142e2d"], [375, 141, "#193a34"]]) {
      block(x + 8, y - 25, 4, 25, "#61463e"); block(x + 4, y - 18, 12, 7, c); block(x + 1, y - 12, 18, 7, c); block(x - 2, y - 6, 24, 7, c);
    }
    // Logs and pixel flames
    block(183, 174, 33, 6, "#744739"); block(187, 181, 27, 5, "#563b3b");
    const flameStep = Math.floor(time * 5) % 4;
    block(190, 160 + flameStep % 2, 20, 12, "#ed6d3c"); block(194, 153 + (flameStep === 1 ? 3 : 0), 12, 9, "#ff9e48"); block(198, 147 + (flameStep === 2 ? 3 : 0), 5, 9, "#ffe28d");
    block(181, 169, 5, 5, "#ffc56c"); block(216, 166, 4, 4, "#ffc56c");
    // Distant fireflies
    for (let i = 0; i < 9; i++) { const x = 135 + ((i * 37 + time * 3) % 125); const y = 90 + Math.sin(time + i) * 19; if (Math.sin(time * .8 + i) > .1) block(x, y, 2, 2, "#b6ed9b"); }
    if (showName) {
      p.textAlign = "center"; p.textBaseline = "middle";
      let fontSize = 24; p.font = `700 ${fontSize}px "Baloo Da 2","Hind Siliguri",sans-serif`;
      while (p.measureText(name).width > 245 && fontSize > 11) { fontSize--; p.font = `700 ${fontSize}px "Baloo Da 2","Hind Siliguri",sans-serif`; }
      p.fillStyle = "#38283c"; p.fillRect(92, 43, 216, 31);
      p.fillStyle = "rgba(255,193,126,.23)"; p.fillRect(99, 49, 202, 1);
      p.fillStyle = "#ffd081"; p.shadowColor = "#ff782e"; p.shadowBlur = 8; p.fillText(name, 200, 60, 205); p.shadowBlur = 0;
      const flamePositions = Math.min(13, Math.max(5, [...name].length));
      for (let i = 0; i < flamePositions; i++) {
        const x = 105 + i * (190 / flamePositions);
        const y = 40 - ((Math.floor(time * 7 + i * 3) % 5) * 2);
        block(x, y, 2, 5, i % 2 ? "#ff9a4a" : "#ffe081");
      }
    }
    // Tiny campfire label bar and CRT scanlines
    p.fillStyle = "rgba(6,11,22,.6)"; p.fillRect(0, 214, 400, 11);
    p.fillStyle = "#a6c5ac"; p.font = `400 10px "Hind Siliguri",monospace`; p.textAlign = "left"; p.textBaseline = "middle"; p.fillText(language === "bn" ? "শুভ রাত্রি · আগুনের পাশে" : "GOOD NIGHT · BY THE FIRE", 12, 220);
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#080e1c"; ctx.fillRect(0, 0, width, height); ctx.drawImage(pixelCanvas, 0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,.02)";
    for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
  }
  return { resize, frame, destroy() { pixelCanvas.width = 1; pixelCanvas.height = 1; } };
}
