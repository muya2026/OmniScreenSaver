import { formatDigits } from "./text.js";

const MONTHS_BN = [
  "বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন",
  "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"
];
const MONTHS_EN = [
  "Boishakh", "Joishtho", "Ashar", "Srabon", "Bhadro", "Ashwin",
  "Kartik", "Agrahayan", "Poush", "Magh", "Falgun", "Chaitra"
];
const DHAKA_ZONE = "Asia/Dhaka";

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function datePartsInDhaka(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "numeric", day: "numeric", timeZone: DHAKA_ZONE
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
}

export function banglaCalendarDate(date = new Date(), language = "bn") {
  const { year, month, day } = datePartsInDhaka(date);
  const currentDay = Date.UTC(year, month - 1, day);
  const startYear = month > 4 || (month === 4 && day >= 14) ? year : year - 1;
  const startDay = Date.UTC(startYear, 3, 14);
  let offset = Math.floor((currentDay - startDay) / 86400000);
  const months = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeapYear(startYear + 1) ? 30 : 29, 30];
  let monthIndex = 0;
  while (monthIndex < months.length - 1 && offset >= months[monthIndex]) {
    offset -= months[monthIndex];
    monthIndex++;
  }
  const banglaYear = startYear - 593;
  const dayOfMonth = offset + 1;
  return {
    day: dayOfMonth,
    monthIndex,
    month: language === "bn" ? MONTHS_BN[monthIndex] : MONTHS_EN[monthIndex],
    year: banglaYear,
    text: language === "bn"
      ? `${formatDigits(dayOfMonth, "bn")} ${MONTHS_BN[monthIndex]} ${formatDigits(banglaYear, "bn")}`
      : `${dayOfMonth} ${MONTHS_EN[monthIndex]} ${banglaYear}`
  };
}

export function dhakaTimeParts(date = new Date(), language = "en") {
  const locale = language === "bn" ? "bn-BD" : "en-US";
  const formatted = new Intl.DateTimeFormat(locale, {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: DHAKA_ZONE
  }).formatToParts(date);
  const parts = Object.fromEntries(formatted.map(part => [part.type, part.value]));
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: DHAKA_ZONE }).format(date)) % 24;
  return {
    hour,
    hourText: parts.hour || "",
    minuteText: parts.minute || "00",
    secondText: parts.second || "00",
    dayPeriod: parts.dayPeriod || "",
    dateText: new Intl.DateTimeFormat(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: DHAKA_ZONE }).format(date)
  };
}

export function banglaMonthNames() {
  return [...MONTHS_BN];
}
