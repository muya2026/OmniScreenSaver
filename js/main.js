import { loadSettings, saveSettings, makeShareUrl } from "./settings.js";
import { applyTranslations, normalizeLanguage, translate } from "./i18n.js";
import { MODES, MODES_BY_ID, DEFAULT_MODE_ID } from "./modes/index.js";
import { limitGraphemes, formatDigits, splitGraphemes } from "./text.js";
import { createNameShape } from "./name-shape.js";
import { typeStyle, loadTypeStyle } from "./modes/type-styles.js";
import { AnimationEngine } from "./engine.js";
import { AudioEngine } from "./audio/audio-engine.js";
import { enterFullscreen, exitFullscreen, requestWakeLock, releaseWakeLock } from "./fullscreen.js";
import { watchForExit } from "./exit-watch.js";

const $ = selector => document.querySelector(selector);
const home = $("#home");
const screen = $("#screensaver");
const canvasHost = $("#canvasHost");
const screenControls = $("#screenControls");
const screenHint = $("#screenHint");
const modeGrid = $("#modeGrid");
const nameInput = $("#nameInput");
const loadResult = loadSettings();
const settings = loadResult.settings;
let selectedModeId = MODES_BY_ID.has(loadResult.requestedMode) ? loadResult.requestedMode : DEFAULT_MODE_ID;
if (loadResult.requestedMode === "shuffle" && !settings.shuffleInterval) settings.shuffleInterval = 5;

let language = normalizeLanguage(settings.language);
let running = false;
let closing = false;
let engine = null;
let exitWatcher = null;
let currentName = "";
let currentShape = null;
let currentModeId = selectedModeId;
let sessionSoundEnabled = settings.soundEnabled;
let idleTimer = 0;
let toastTimer = 0;
let shuffleElapsed = 0;
let wakeLock = null;

/**
 * Gallery previews. Every tile runs its own live animation — there are no
 * still mode thumbnails. Tiles only tick while they are visible or just
 * offscreen, and they stop completely while the screensaver is running.
 */
const previews = new Map();
let previewObserver = null;
let previewFrame = 0;
let previewInterval = 1 / 30;
let resizeTimer = 0;
let shapeTimer = 0;
let shapeRequestId = 0;
let shapeByMode = new Map();
const SHAPE_MODE_IDS = new Set(["starfield", "mystify", "life", "fireworks", "lava", "flow", "constellation", "campfire"]);

const audio = new AudioEngine(() => {
  if (running) showToast(translate(language, "soundDisabled"));
});
audio.setVolume(settings.volume);
audio.setEnabled(settings.soundEnabled);

const ui = {
  nameInput,
  graphemeCount: $("#graphemeCount"),
  soundToggle: $("#soundToggle"),
  volumeInput: $("#volumeInput"),
  volumeValue: $("#volumeValue"),
  screenSoundToggle: $("#screenSoundToggle"),
  screenVolumeInput: $("#screenVolumeInput"),
  speedInput: $("#speedInput"),
  speedValue: $("#speedValue"),
  shuffleSelect: $("#shuffleSelect"),
  showNameInput: $("#showNameInput"),
  wakeLockInput: $("#wakeLockInput"),
  autoStartSelect: $("#autoStartSelect"),
  startButton: $("#startButton"),
  closeButton: $("#closeButton"),
  shareButton: $("#shareButton"),
  toast: $("#toast"),
  languageToggle: $("#languageToggle"),
  modeCount: $("#modeCount")
};

function currentDisplayName() {
  return settings.name || translate(language, "defaultName");
}

function shapeFor(modeId) {
  if (!SHAPE_MODE_IDS.has(modeId)) return null;
  return shapeByMode.get(modeId) || currentShape;
}

/* ------------------------------------------------------------------ *
 * Name shapes, one per typeface treatment
 * ------------------------------------------------------------------ */

async function refreshHomeShapes() {
  const requestId = ++shapeRequestId;
  const text = currentDisplayName();
  const modes = [...SHAPE_MODE_IDS].map(id => MODES_BY_ID.get(id)).filter(Boolean);
  const styles = [...new Map(MODES.map(mode => {
    const style = typeStyle(mode.id);
    return [`${style.weight}|${style.family}`, style];
  })).values()];
  const [built] = await Promise.all([
    Promise.all(modes.map(async mode => ({
      id: mode.id,
      shape: await createNameShape(text, {
        language,
        showName: settings.showName,
        style: typeStyle(mode.id)
      })
    }))),
    Promise.all(styles.map(style => loadTypeStyle(style, `বাংলা ${text}`)))
  ]);
  if (requestId !== shapeRequestId || running) return;
  shapeByMode = new Map(built.map(item => [item.id, item.shape]));
  currentShape = shapeFor(currentModeId);
  rebuildPreviews();
}

function scheduleShapeRefresh() {
  if (shapeTimer) clearTimeout(shapeTimer);
  shapeTimer = setTimeout(() => {
    shapeTimer = 0;
    refreshHomeShapes();
  }, 180);
}

/* ------------------------------------------------------------------ *
 * Live gallery previews
 * ------------------------------------------------------------------ */

function destroyPreview(preview) {
  try { preview.renderer?.destroy?.(); } catch { /* Preview teardown is best-effort. */ }
  preview.card.classList.remove("has-live-preview");
  previews.delete(preview.card);
}

function stopAllPreviews() {
  if (previewFrame) cancelAnimationFrame(previewFrame);
  previewFrame = 0;
  for (const preview of [...previews.values()]) destroyPreview(preview);
  previews.clear();
}

function createPreview(card, mode) {
  const canvas = card.querySelector(".mode-preview-canvas");
  if (!canvas) return null;
  const art = card.querySelector(".mode-art");
  let renderer;
  try {
    renderer = mode.create({
      canvas,
      name: currentDisplayName(),
      shape: shapeFor(mode.id),
      language,
      showName: settings.showName,
      preview: true,
      emitSound: () => {}
    });
  } catch {
    return null;
  }
  const measure = () => {
    const width = Math.max(80, art?.clientWidth || 240);
    const height = Math.max(48, art?.clientHeight || 78);
    renderer.resize?.(width, height, 1);
  };
  measure();
  card.classList.add("has-live-preview");
  return { card, mode, renderer, measure, last: 0, elapsed: 0, visible: false };
}

function ensurePreviewFor(card) {
  if (previews.has(card) || running || document.hidden) return;
  const mode = MODES_BY_ID.get(card.dataset.mode);
  if (!mode) return;
  const preview = createPreview(card, mode);
  if (preview) previews.set(card, preview);
}

function observePreviews() {
  previewObserver?.disconnect();
  if (typeof IntersectionObserver !== "function") {
    modeGrid.querySelectorAll(".mode-card").forEach(card => {
      ensurePreviewFor(card);
      const preview = previews.get(card);
      if (preview) preview.visible = true;
    });
    startPreviewLoop();
    return;
  }
  previewObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        ensurePreviewFor(entry.target);
        const preview = previews.get(entry.target);
        if (preview) {
          preview.visible = true;
          preview.last = 0;
        }
      } else {
        const preview = previews.get(entry.target);
        if (preview) destroyPreview(preview);
      }
    }
    startPreviewLoop();
  }, { rootMargin: "120px 0px", threshold: 0.01 });
  modeGrid.querySelectorAll(".mode-card").forEach(card => previewObserver.observe(card));
  startPreviewLoop();
}

function startPreviewLoop() {
  if (previewFrame || running || document.hidden || !previews.size) return;
  previewFrame = requestAnimationFrame(previewTick);
}

function previewTick(timestamp) {
  previewFrame = 0;
  if (running || document.hidden) return;
  const now = timestamp / 1000;
  const started = performance.now();
  let rendered = 0;
  for (const preview of [...previews.values()]) {
    if (!preview.visible) continue;
    if (preview.last && now - preview.last < previewInterval) continue;
    const dt = preview.last ? Math.min(0.05, now - preview.last) : 1 / 60;
    preview.last = now;
    preview.elapsed += dt * settings.speed;
    try {
      preview.renderer.frame(dt * settings.speed, preview.elapsed);
      rendered++;
    } catch {
      destroyPreview(preview);
    }
  }
  if (rendered) {
    // Back off if the gallery is costing too much, then recover.
    const cost = performance.now() - started;
    if (cost > 18) previewInterval = Math.min(1 / 10, previewInterval * 1.6);
    else if (cost > 9) previewInterval = Math.min(1 / 15, previewInterval * 1.25);
    else if (cost < 4) previewInterval = Math.max(1 / 30, previewInterval * 0.94);
  }
  startPreviewLoop();
}

function rebuildPreviews() {
  if (running) return;
  stopAllPreviews();
  observePreviews();
}

function measurePreviews() {
  for (const preview of previews.values()) preview.measure?.();
}

/* ------------------------------------------------------------------ *
 * Settings and interface
 * ------------------------------------------------------------------ */

function persist() {
  settings.language = language;
  saveSettings(settings);
}

function formatPercent(value) {
  return `${formatDigits(Math.round(value * 100), language)}%`;
}

function syncSoundUI() {
  const homeOn = Boolean(settings.soundEnabled);
  ui.soundToggle.classList.toggle("is-on", homeOn);
  ui.soundToggle.setAttribute("aria-checked", String(homeOn));
  ui.soundToggle.setAttribute("aria-label", translate(language, homeOn ? "soundOn" : "soundOff"));
  ui.volumeInput.value = String(Math.round(settings.volume * 100));
  ui.volumeValue.textContent = formatPercent(settings.volume);
  ui.screenSoundToggle.classList.toggle("is-muted", !sessionSoundEnabled);
  ui.screenSoundToggle.setAttribute("aria-label", translate(language, sessionSoundEnabled ? "soundOn" : "soundOff"));
  ui.screenSoundToggle.title = translate(language, sessionSoundEnabled ? "soundOn" : "soundOff");
  ui.screenSoundToggle.textContent = sessionSoundEnabled ? "♫" : "♩̸";
  ui.screenVolumeInput.value = String(Math.round(settings.volume * 100));
  ui.screenVolumeInput.setAttribute("aria-label", `${translate(language, "volume")}: ${formatPercent(settings.volume)}`);
}

function syncSettingsControls() {
  nameInput.value = settings.name;
  ui.speedInput.value = String(Math.round(settings.speed * 100));
  ui.speedValue.textContent = formatPercent(settings.speed);
  ui.shuffleSelect.value = String(settings.shuffleInterval);
  ui.showNameInput.checked = settings.showName;
  ui.wakeLockInput.checked = settings.keepAwake;
  ui.autoStartSelect.value = String(settings.autoStart);
  updateNameCount();
  syncSoundUI();
}

function updateNameCount() {
  const clusters = splitGraphemes(settings.name, language).length;
  ui.graphemeCount.textContent = translate(language, "graphemeCount", { count: formatDigits(clusters, language) });
}

function updateTitle() {
  document.title = language === "bn" ? "অমনিস্ক্রিনসেভার — একটু মুগ্ধতা" : "OmniScreenSaver — drift into a little wonder";
}

function setSelectedCard() {
  modeGrid.querySelectorAll(".mode-card").forEach(card => {
    const selected = card.dataset.mode === selectedModeId;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

async function copyShareLink() {
  const url = makeShareUrl({ mode: selectedModeId, name: settings.name, language });
  try {
    await navigator.clipboard.writeText(url);
    showToast(translate(language, "linkCopied"));
  } catch {
    showToast(translate(language, "copyFailed"));
    window.prompt(translate(language, "share"), url);
  }
}

function createModeCard(mode) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "mode-card";
  card.dataset.mode = mode.id;
  card.setAttribute("aria-pressed", "false");
  const art = document.createElement("span");
  art.className = `mode-art mode-art--${mode.art}`;
  art.setAttribute("aria-hidden", "true");
  const preview = document.createElement("canvas");
  preview.className = "mode-preview-canvas";
  const symbol = document.createElement("span");
  symbol.className = "mode-art-symbol";
  symbol.textContent = mode.icon;
  art.append(preview, symbol);
  const copy = document.createElement("span");
  copy.className = "mode-card-copy";
  const title = document.createElement("span");
  title.className = "mode-card-title";
  title.textContent = translate(language, mode.nameKey);
  const description = document.createElement("span");
  description.className = "mode-card-description";
  description.textContent = translate(language, mode.descriptionKey);
  copy.append(title, description);
  card.append(art, copy);

  card.addEventListener("click", () => {
    selectedModeId = mode.id;
    setSelectedCard();
    persist();
  });
  return card;
}

function renderGallery() {
  previewObserver?.disconnect();
  stopAllPreviews();
  modeGrid.replaceChildren(...MODES.map(createModeCard));
  ui.modeCount.textContent = translate(language, "modeCount", { count: formatDigits(MODES.length, language) });
  setSelectedCard();
  observePreviews();
}

function changeLanguage(nextLanguage) {
  language = normalizeLanguage(nextLanguage);
  settings.language = language;
  applyTranslations(language);
  renderGallery();
  syncSettingsControls();
  updateTitle();
  persist();
  if (!running) refreshHomeShapes();
  if (running) {
    // The screensaver's current pixels remain stable; the next selected mode uses the new language.
    screen.setAttribute("lang", language);
  }
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("is-visible"), 2200);
}

function syncSessionAudio() {
  audio.setEnabled(sessionSoundEnabled);
  audio.setVolume(settings.volume);
}

function ensureAudioFromGesture() {
  const resume = audio.startFromGesture();
  syncSessionAudio();
  if (currentModeId && !audio.current) audio.setScene(currentModeId);
  return resume;
}

function setSessionSound(enabled, fromUserGesture = false) {
  sessionSoundEnabled = Boolean(enabled);
  settings.soundEnabled = sessionSoundEnabled;
  syncSessionAudio();
  if (running && sessionSoundEnabled && fromUserGesture) ensureAudioFromGesture();
  syncSoundUI();
  persist();
}

function handleScreenSoundToggle() {
  setSessionSound(!sessionSoundEnabled, true);
  showToast(translate(language, sessionSoundEnabled ? "soundEnabled" : "soundDisabled"));
}

function handleHomeSoundToggle() {
  settings.soundEnabled = !settings.soundEnabled;
  if (!running) sessionSoundEnabled = settings.soundEnabled;
  audio.setEnabled(settings.soundEnabled);
  syncSoundUI();
  persist();
}

function handleVolume(value) {
  settings.volume = Math.min(1, Math.max(0, Number(value) / 100));
  audio.setVolume(settings.volume);
  syncSoundUI();
  persist();
}

async function acquireWakeLock() {
  if (!running || !settings.keepAwake || wakeLock) return;
  const lock = await requestWakeLock(true);
  if (!lock) return;
  if (!running || !settings.keepAwake) { await releaseWakeLock(lock); return; }
  wakeLock = lock;
  lock.addEventListener("release", () => { if (wakeLock === lock) wakeLock = null; });
}

async function releaseCurrentWakeLock() {
  const lock = wakeLock;
  wakeLock = null;
  await releaseWakeLock(lock);
}

function nextModeId() {
  const currentIndex = MODES.findIndex(mode => mode.id === currentModeId);
  return MODES[(currentIndex + 1 + MODES.length) % MODES.length].id;
}

function startRenderer(modeId) {
  const mode = MODES_BY_ID.get(modeId);
  if (!mode) throw new Error(`Unknown animation mode: ${modeId}`);
  if (engine) engine.destroy();
  currentModeId = modeId;
  selectedModeId = modeId;
  currentShape = shapeFor(modeId);
  setSelectedCard();
  const nextEngine = new AnimationEngine({
    host: canvasHost,
    mode,
    modeId,
    name: currentName,
    shape: currentShape,
    language,
    settings: { ...settings },
    emitSound: eventName => audio.trigger(eventName),
    onFrame: dt => {
      if (!running || !settings.shuffleInterval) return;
      shuffleElapsed += dt;
      if (shuffleElapsed >= settings.shuffleInterval * 60) {
        shuffleElapsed = 0;
        startRenderer(nextModeId());
      }
    },
    onError: error => {
      console.error("OmniScreenSaver animation error:", error);
      showToast(language === "bn" ? "এই দৃশ্যটি শুরু করা যায়নি" : "This scene could not be started");
      window.setTimeout(() => closeScreensaver("error"), 900);
    }
  });
  engine = nextEngine;
  if (audio.context) audio.setScene(modeId);
}

async function launchScreensaver(modeId = selectedModeId, { userGesture = true } = {}) {
  if (running || closing) return;
  const mode = MODES_BY_ID.has(modeId) ? modeId : DEFAULT_MODE_ID;
  stopAllPreviews();
  running = true;
  closing = false;
  currentModeId = mode;
  selectedModeId = mode;
  currentName = currentDisplayName();
  sessionSoundEnabled = userGesture ? settings.soundEnabled : false;
  audio.setEnabled(sessionSoundEnabled);
  audio.setVolume(settings.volume);
  screen.classList.add("is-running");
  screen.inert = false;
  screen.setAttribute("aria-hidden", "false");
  screen.setAttribute("lang", language);
  home.inert = true;
  home.setAttribute("aria-hidden", "true");
  screenControls.classList.remove("is-visible");
  screenHint.classList.remove("is-visible");
  clearTimeout(toastTimer);
  ui.toast.classList.remove("is-visible");
  ui.toast.textContent = "";
  setSelectedCard();
  syncSoundUI();

  // Invoke browser-gated APIs synchronously inside the Start gesture before awaiting fonts.
  const fullscreenPromise = userGesture ? enterFullscreen(screen) : Promise.resolve(false);
  const audioPromise = userGesture ? audio.startFromGesture() : Promise.resolve(false);
  if (userGesture) syncSessionAudio();
  exitWatcher = watchForExit({
    screen,
    controls: screenControls,
    closeButton: ui.closeButton,
    onExit: reason => closeScreensaver(reason)
  });
  acquireWakeLock();
  shuffleElapsed = 0;

  try {
    const requestId = ++shapeRequestId;
    if (!SHAPE_MODE_IDS.has(mode)) await loadTypeStyle(typeStyle(mode), `বাংলা ${currentName}`);
    const shape = SHAPE_MODE_IDS.has(mode)
      ? await createNameShape(currentName, {
          language,
          showName: settings.showName,
          style: typeStyle(mode)
        })
      : null;
    if (!running || requestId !== shapeRequestId) return;
    currentShape = shape;
    if (shape) shapeByMode = new Map(shapeByMode).set(mode, shape);
    startRenderer(mode);
    if (userGesture) {
      await Promise.allSettled([fullscreenPromise, audioPromise]);
    }
    syncSoundUI();
  } catch (error) {
    console.error("OmniScreenSaver could not start:", error);
    showToast(language === "bn" ? "স্ক্রিনসেভার শুরু করা যায়নি" : "Could not start the screensaver");
    window.setTimeout(() => closeScreensaver("error"), 700);
  }
}

async function closeScreensaver(reason = "close") {
  if (!running || closing) return;
  closing = true;
  running = false;
  if (exitWatcher) { exitWatcher.destroy(); exitWatcher = null; }
  if (engine) { engine.destroy(); engine = null; }
  audio.stop();
  await releaseCurrentWakeLock();
  await exitFullscreen();
  screen.classList.remove("is-running");
  screen.inert = true;
  screen.setAttribute("aria-hidden", "true");
  screen.removeAttribute("lang");
  home.inert = false;
  home.setAttribute("aria-hidden", "false");
  screenControls.classList.remove("is-visible");
  clearTimeout(toastTimer);
  ui.toast.classList.remove("is-visible");
  ui.toast.textContent = "";
  canvasHost.replaceChildren();
  currentShape = null;
  sessionSoundEnabled = settings.soundEnabled;
  refreshHomeShapes();
  syncSoundUI();
  persist();
  closing = false;
  resetIdleTimer();
  window.setTimeout(() => ui.startButton.focus({ preventScroll: true }), 80);
  if (reason === "error") window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  if (running || closing || !settings.autoStart) return;
  idleTimer = setTimeout(() => {
    idleTimer = 0;
    if (!running) launchScreensaver(selectedModeId, { userGesture: false });
  }, settings.autoStart * 60 * 1000);
}

function handleNameInput() {
  const limited = limitGraphemes(nameInput.value, 24, language);
  if (limited !== nameInput.value) {
    const start = nameInput.selectionStart;
    nameInput.value = limited;
    try { nameInput.setSelectionRange(Math.min(start, limited.length), Math.min(start, limited.length)); } catch { /* input type may not expose a selection */ }
  }
  settings.name = limited;
  updateNameCount();
  persist();
  scheduleShapeRefresh();
}

function bindControls() {
  ui.languageToggle.addEventListener("click", () => changeLanguage(language === "en" ? "bn" : "en"));
  nameInput.addEventListener("input", event => { if (!event.isComposing) handleNameInput(); });
  nameInput.addEventListener("compositionend", handleNameInput);
  ui.soundToggle.addEventListener("click", handleHomeSoundToggle);
  ui.screenSoundToggle.addEventListener("click", handleScreenSoundToggle);
  ui.volumeInput.addEventListener("input", event => handleVolume(event.currentTarget.value));
  ui.screenVolumeInput.addEventListener("input", event => handleVolume(event.currentTarget.value));
  ui.speedInput.addEventListener("input", event => {
    settings.speed = Number(event.currentTarget.value) / 100;
    ui.speedValue.textContent = formatPercent(settings.speed);
    engine?.setSpeed(settings.speed);
    persist();
  });
  ui.shuffleSelect.addEventListener("change", event => { settings.shuffleInterval = Number(event.currentTarget.value) || 0; shuffleElapsed = 0; persist(); });
  ui.showNameInput.addEventListener("change", event => {
    settings.showName = event.currentTarget.checked;
    persist();
    scheduleShapeRefresh();
  });
  ui.wakeLockInput.addEventListener("change", event => {
    settings.keepAwake = event.currentTarget.checked; persist();
    if (settings.keepAwake) acquireWakeLock(); else releaseCurrentWakeLock();
  });
  ui.autoStartSelect.addEventListener("change", event => { settings.autoStart = Number(event.currentTarget.value) || 0; persist(); resetIdleTimer(); });
  ui.startButton.addEventListener("click", () => launchScreensaver(selectedModeId, { userGesture: true }));
  ui.closeButton.addEventListener("click", event => { event.preventDefault(); closeScreensaver("button"); });
  ui.shareButton.addEventListener("click", copyShareLink);
  document.addEventListener("pointerdown", resetIdleTimer, { passive: true });
  document.addEventListener("pointermove", resetIdleTimer, { passive: true });
  document.addEventListener("keydown", resetIdleTimer, { passive: true });
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resizeTimer = 0; measurePreviews(); }, 160);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && running && settings.keepAwake && !wakeLock) acquireWakeLock();
    if (document.hidden) {
      if (previewFrame) cancelAnimationFrame(previewFrame);
      previewFrame = 0;
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = 0; }
    } else {
      for (const preview of previews.values()) preview.last = 0;
      if (!running) observePreviews();
      else startPreviewLoop();
      if (!running) resetIdleTimer();
    }
  });
}

function initialize() {
  applyTranslations(language);
  syncSettingsControls();
  renderGallery();
  updateTitle();
  refreshHomeShapes();
  $("#yearText").textContent = String(new Date().getFullYear());
  bindControls();
  persist();
  resetIdleTimer();
}

initialize();
