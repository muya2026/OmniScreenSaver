const MARK_RE = /\p{Mark}/u;
const CONTROL_RE = /[\u0000-\u001F\u007F-\u009F]/g;

function fallbackGraphemes(text) {
  const clusters = [];
  let current = "";
  for (const character of Array.from(text)) {
    const codePoint = character.codePointAt(0);
    const joinsPrevious = current && (
      MARK_RE.test(character) ||
      codePoint === 0x200d ||
      codePoint === 0xfe0e ||
      codePoint === 0xfe0f ||
      current.endsWith("\u09cd") ||
      current.endsWith("\u200d")
    );
    if (joinsPrevious) current += character;
    else {
      if (current) clusters.push(current);
      current = character;
    }
  }
  if (current) clusters.push(current);
  return clusters;
}

export function splitGraphemes(text, language = "en") {
  const value = String(text ?? "").normalize("NFC");
  try {
    if (typeof Intl.Segmenter === "function") {
      return [...new Intl.Segmenter(language === "bn" ? "bn" : "en", { granularity: "grapheme" }).segment(value)]
        .map(part => part.segment);
    }
  } catch {
    // Fall back below when a browser has incomplete ICU locale data.
  }
  return fallbackGraphemes(value);
}

export function limitGraphemes(value, max = 24, language = "en") {
  const clean = String(value ?? "").normalize("NFC").replace(CONTROL_RE, "").trim();
  return splitGraphemes(clean, language).slice(0, max).join("");
}

export function formatDigits(value, language = "en") {
  return new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-US", { useGrouping: false }).format(value);
}
