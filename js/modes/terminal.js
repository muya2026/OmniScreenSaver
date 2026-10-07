import { setup2D, drawName, roundedRect, clamp } from "./common.js";
import { splitGraphemes } from "../text.js";

export function createMode({ canvas, name, language, showName }) {
  const surface = setup2D(canvas, "#020707");
  const { ctx } = surface;
  let width = 1, height = 1;
  function resize(w, h, ratio) { surface.resize(w, h, ratio); width = w; height = h; }
  function frame(dt, time) {
    ctx.fillStyle = "#020707"; ctx.fillRect(0, 0, width, height);
    const panelW = Math.min(width * .82, 920), panelH = Math.min(height * .72, 560);
    const left = (width - panelW) / 2, top = (height - panelH) / 2;
    ctx.save();
    ctx.shadowColor = "rgba(37,230,153,.12)"; ctx.shadowBlur = 38;
    ctx.fillStyle = "rgba(4,15,13,.96)"; ctx.strokeStyle = "rgba(81,219,158,.34)"; ctx.lineWidth = 1;
    roundedRect(ctx, left, top, panelW, panelH, 15); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    const bar = ctx.createLinearGradient(left, top, left + panelW, top + 28); bar.addColorStop(0, "rgba(39,129,96,.4)"); bar.addColorStop(1, "rgba(24,67,61,.28)");
    ctx.fillStyle = bar; roundedRect(ctx, left + 1, top + 1, panelW - 2, 40, 14); ctx.fill();
    ctx.fillStyle = "#68cfa4"; ctx.font = `600 12px "Hind Siliguri",sans-serif`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.fillText(language === "bn" ? "অমনিস্ক্রিনসেভার · নিরাপদ সেশন" : "OMNISCREENSAVER · SECURE SESSION", left + 21, top + 21);
    ["#ff8585", "#f4ce81", "#82e1ae"].forEach((color, i) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(left + panelW - 52 + i * 14, top + 20, 3.5, 0, Math.PI * 2); ctx.fill(); });

    const messages = language === "bn"
      ? ["সিস্টেম প্রস্তুত করা হচ্ছে…", "নিরাপদ সংযোগ তৈরি হয়েছে", "ব্যবহারকারী শনাক্ত হয়েছে", `স্বাগতম, ${showName ? name : "বন্ধু"}`, "আলোর জগৎ লোড হচ্ছে…"]
      : ["Initializing visual engine…", "Secure session established", "Identity recognized", `Welcome, ${showName ? name : "friend"}`, "Loading a little wonder…"];
    const cycle = time % 20;
    const elapsed = cycle + 1.5;
    const lineGap = Math.max(27, Math.min(38, panelH * .075));
    const firstY = top + 76;
    ctx.font = `400 ${Math.max(13, Math.min(17, panelW * .021))}px "Hind Siliguri",monospace`;
    ctx.textBaseline = "top";
    for (let i = 0; i < messages.length; i++) {
      const lineStart = i * 2.4;
      const lineProgress = clamp((elapsed - lineStart) / .06, 0, splitGraphemes(messages[i], language).length);
      if (lineProgress <= 0) continue;
      const visible = splitGraphemes(messages[i], language).slice(0, Math.floor(lineProgress)).join("");
      const y = firstY + i * lineGap;
      ctx.fillStyle = i === 3 ? "#b8ffd8" : "#72d8a5";
      ctx.shadowColor = "rgba(75,255,163,.5)"; ctx.shadowBlur = 6;
      ctx.fillText(`${i === 3 ? "✦" : "›"} ${visible}`, left + 24, y, panelW - 48);
      ctx.shadowBlur = 0;
      if (lineProgress < splitGraphemes(messages[i], language).length && lineProgress > 0) {
        ctx.fillStyle = "#a9ffca"; ctx.fillRect(left + 27 + Math.min(panelW * .7, ctx.measureText(visible).width), y + 2, 8, 15);
      }
    }
    const bannerY = top + panelH * .72;
    ctx.strokeStyle = "rgba(91,219,160,.14)"; ctx.beginPath(); ctx.moveTo(left + 23, bannerY - 18); ctx.lineTo(left + panelW - 23, bannerY - 18); ctx.stroke();
    if (showName) {
      const glow = ctx.createLinearGradient(left, 0, left + panelW, 0); glow.addColorStop(0, "#42c987"); glow.addColorStop(.5, "#d2ffe5"); glow.addColorStop(1, "#6ef0ae");
      drawName(ctx, name, width / 2, bannerY + panelH * .11, { maxWidth: panelW * .82, maxHeight: panelH * .2, size: 116, color: glow, stroke: "rgba(84,243,158,.5)", strokeWidth: 1, shadow: "#40d98b", blur: 18, alpha: .85 + .1 * Math.sin(time * 1.7) });
    }
    ctx.fillStyle = "rgba(119,215,165,.42)"; ctx.textAlign = "left"; ctx.font = `11px "Hind Siliguri",sans-serif`;
    ctx.fillText(language === "bn" ? "সব অ্যানিমেশন চলছে · ১০০%" : "ALL VISUAL SYSTEMS NOMINAL · 100%", left + 24, top + panelH - 28);
    ctx.restore();
  }
  return { resize, frame, destroy() {} };
}
