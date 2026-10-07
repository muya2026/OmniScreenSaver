import { setup2D, roundedRect, drawName, drawPine, random, TAU } from "./common.js";
import { banglaCalendarDate, dhakaTimeParts } from "../calendar.js";
import { translate } from "../i18n.js";

export function createMode({ canvas, name, language = "en", showName }) {
  const surface = setup2D(canvas, "#091026");
  const { ctx } = surface;
  let width = 1, height = 1, stars = [], cachedSecond = -1, cachedTime = null;
  function resize(w, h, ratio) { surface.resize(w, h, ratio); width = w; height = h; stars = Array.from({ length: 100 }, () => ({ x: random(0, w), y: random(0, h * .56), r: random(.4, 1.4), p: random(0, TAU) })); }
  function card(x, y, w, h, text, scaleY = 1) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(1, Math.max(.06, scaleY));
    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gradient.addColorStop(0, "#18254a"); gradient.addColorStop(.52, "#111c3a"); gradient.addColorStop(1, "#0d1732");
    ctx.fillStyle = gradient; ctx.strokeStyle = "rgba(181,199,255,.19)"; ctx.lineWidth = 1; ctx.shadowColor = "rgba(87,126,214,.17)"; ctx.shadowBlur = 20;
    roundedRect(ctx, -w / 2, -h / 2, w, h, 13); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(4,8,21,.35)"; ctx.fillRect(-w / 2 + 1, 0, w - 2, 1);
    ctx.fillStyle = "#e8f0ff"; ctx.font = `700 ${h * .61}px "Baloo Da 2","Hind Siliguri",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "rgba(116,172,255,.33)"; ctx.shadowBlur = 12; ctx.fillText(text, 0, 1);
    ctx.restore();
  }
  function frame(dt, time) {
    const now = new Date();
    const seconds = Math.floor(now.getTime() / 1000);
    if (seconds !== cachedSecond) { cachedSecond = seconds; cachedTime = dhakaTimeParts(now, language); }
    const bg = ctx.createLinearGradient(0, 0, 0, height); bg.addColorStop(0, "#0b1634"); bg.addColorStop(.48, "#1d2850"); bg.addColorStop(1, "#080d1d"); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    const moonX = width * .81, moonY = height * .21, moonR = Math.min(width, height) * .048;
    const moon = ctx.createRadialGradient(moonX - moonR * .3, moonY - moonR * .3, 1, moonX, moonY, moonR * 1.15); moon.addColorStop(0, "#f8f1ff"); moon.addColorStop(.55, "#b8c9ff"); moon.addColorStop(1, "rgba(135,161,230,0)"); ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 1.5, 0, TAU); ctx.fill();
    for (const star of stars) { ctx.globalAlpha = .2 + .55 * (Math.sin(time + star.p) + 1) / 2; ctx.fillStyle = "#e8e7ff"; ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    const cardH = Math.min(height * .31, width * .34, 245); const cardY = height * .31; const groupGap = 18; const cardGap = 5; const cardW = Math.min(width * .135, cardH * .75); const groupW = cardW * 2 + cardGap;
    const totalW = groupW * 2 + groupGap + 22;
    const startX = (width - totalW) / 2;
    const hDigits = (cachedTime?.hourText || "12").padStart(2, language === "bn" ? "০" : "0");
    const mDigits = (cachedTime?.minuteText || "00").padStart(2, language === "bn" ? "০" : "0");
    const flip = .18 + .82 * Math.abs(Math.cos((now.getMilliseconds() / 1000) * Math.PI));
    card(startX, cardY, cardW, cardH, [...hDigits][0] || "0", flip);
    card(startX + cardW + cardGap, cardY, cardW, cardH, [...hDigits][1] || "0", flip);
    ctx.fillStyle = "#c8d6ff"; ctx.font = `700 ${cardH * .28}px "Baloo Da 2",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(":", startX + groupW + groupGap / 2, cardY + cardH / 2);
    const rightX = startX + groupW + groupGap + 22;
    card(rightX, cardY, cardW, cardH, [...mDigits][0] || "0", flip);
    card(rightX + cardW + cardGap, cardY, cardW, cardH, [...mDigits][1] || "0", flip);
    ctx.fillStyle = "#aebcdb"; ctx.font = `500 ${Math.max(12, cardH * .105)}px "Hind Siliguri",sans-serif`; ctx.textAlign = "center";
    ctx.fillText(`${cachedTime?.dayPeriod || ""}  ·  ${language === "bn" ? "ঢাকা, বাংলাদেশ" : "DHAKA, BANGLADESH"}`, width / 2, cardY + cardH + 25);

    const greetKey = cachedTime?.hour < 12 ? (language === "bn" ? "bnGoodMorning" : "goodMorning") : cachedTime?.hour < 17 ? (language === "bn" ? "bnGoodAfternoon" : "goodAfternoon") : cachedTime?.hour < 21 ? (language === "bn" ? "bnGoodEvening" : "goodEvening") : (language === "bn" ? "bnGoodNight" : "goodNight");
    const greeting = translate(language, greetKey) + (showName && name ? `, ${name}` : "");
    if (showName) drawName(ctx, greeting, width / 2, height * .74, { maxWidth: width * .82, maxHeight: height * .1, size: 64, color: "#e6e4ff", shadow: "#8e8dff", blur: 17, alpha: .94 });
    const banglaDate = banglaCalendarDate(now, language);
    ctx.fillStyle = "rgba(196,207,240,.76)"; ctx.font = `400 ${Math.max(12, Math.min(17, width * .015))}px "Hind Siliguri",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${cachedTime?.dateText || ""}  ·  ${banglaDate.text}`, width / 2, height * .83, width * .88);
    const ridgeY = height * .94; ctx.fillStyle = "rgba(7,13,32,.82)"; ctx.beginPath(); ctx.moveTo(0, ridgeY); ctx.lineTo(width * .13, ridgeY - height * .1); ctx.lineTo(width * .23, ridgeY - height * .04); ctx.lineTo(width * .38, ridgeY - height * .13); ctx.lineTo(width * .56, ridgeY - height * .03); ctx.lineTo(width * .72, ridgeY - height * .1); ctx.lineTo(width, ridgeY - height * .01); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 8; i++) drawPine(ctx, width * (i / 7), height, height * (.13 + (i % 3) * .035), "#050b1e", Math.sin(time * .3 + i) * 3);
  }
  return { resize, frame, destroy() {} };
}
