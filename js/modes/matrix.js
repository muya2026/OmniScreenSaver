import { setup2D, random, drawName, TAU, clamp } from "./common.js";
import { splitGraphemes } from "../text.js";

const LATIN = Array.from("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@$%+=<>/\\");
const BENGALI = splitGraphemes("অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃঁ", "bn");

export function createMode({ canvas, name, shape, language, showName }) {
  const surface = setup2D(canvas, "#020a07");
  const { ctx } = surface;
  let width = 1, height = 1, columns = [], chars = [];
  function resize(w, h, ratio) {
    surface.resize(w, h, ratio); width = w; height = h;
    chars = language === "bn" ? BENGALI : LATIN;
    const fontSize = Math.max(14, Math.min(22, Math.round(width / 70)));
    columns = Array.from({ length: Math.ceil(width / fontSize) + 1 }, () => ({ y: random(-height, 0), speed: random(55, 175), trail: Math.floor(random(5, 19)), fontSize }));
  }
  function frame(dt, time) {
    ctx.fillStyle = "rgba(1,8,6,.32)"; ctx.fillRect(0, 0, width, height);
    ctx.font = `500 ${columns[0]?.fontSize || 18}px "Hind Siliguri", monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let col = 0; col < columns.length; col++) {
      const stream = columns[col];
      stream.y += stream.speed * dt;
      if (stream.y > height + stream.trail * stream.fontSize) { stream.y = random(-height * .5, -20); stream.speed = random(55, 175); }
      for (let line = 0; line < stream.trail; line++) {
        const y = stream.y - line * stream.fontSize;
        if (y < -stream.fontSize || y > height + stream.fontSize) continue;
        const char = chars[Math.floor(random(0, chars.length))];
        const strength = 1 - line / stream.trail;
        ctx.globalAlpha = clamp(strength * .78, .08, .86);
        ctx.fillStyle = line === 0 ? "#d9ffe6" : `hsl(${113 + strength * 32} 91% ${25 + strength * 48}%)`;
        ctx.shadowColor = line === 0 ? "#baffce" : "#31d36b"; ctx.shadowBlur = line === 0 ? 12 : 4;
        ctx.fillText(char, col * stream.fontSize + stream.fontSize / 2, y);
      }
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if (showName) {
      const beat = .74 + .15 * Math.sin(time * .8);
      drawName(ctx, name, width / 2, height / 2, { maxWidth: width * .75, maxHeight: height * .21, size: 142, color: `rgba(198,255,211,${beat})`, stroke: "rgba(75,255,127,.74)", strokeWidth: 1.5, shadow: "#21ff73", blur: 32, alpha: .93 });
    }
  }
  return { resize, frame, destroy() {} };
}
