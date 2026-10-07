export function watchForExit({ screen, controls, closeButton, onExit, inactivityMs = 3000, ignoreMs = 950 }) {
  let active = true;
  let ignoreUntil = performance.now() + ignoreMs;
  let hideTimer = 0;
  let lastPoint = null;
  let enteredFullscreen = false;
  const cleanup = [];

  const listen = (target, type, handler, options = {}) => {
    target.addEventListener(type, handler, options);
    cleanup.push(() => target.removeEventListener(type, handler, options));
  };
  const swallowed = event => {
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
  };
  const showControls = () => {
    if (!active) return;
    controls.classList.add("is-visible");
    screen.classList.add("cursor-visible");
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      controls.classList.remove("is-visible");
      screen.classList.remove("cursor-visible");
    }, inactivityMs);
  };
  const exit = (reason, event) => {
    if (!active || performance.now() < ignoreUntil) return;
    if (event) swallowed(event);
    active = false;
    if (hideTimer) clearTimeout(hideTimer);
    onExit(reason);
  };
  const onPointerMove = event => {
    if (!active || event.pointerType === "touch") return;
    const point = { x: event.clientX, y: event.clientY };
    if (lastPoint) {
      const dx = point.x - lastPoint.x, dy = point.y - lastPoint.y;
      if (dx * dx + dy * dy < 81) return;
    }
    lastPoint = point;
    showControls();
  };
  const onWheel = () => showControls();
  const onKeyDown = event => exit("keyboard", event);
  const onTouchStart = event => exit("touch", event);
  const onClose = event => exit("button", event);
  const onFullscreenChange = () => {
    const current = document.fullscreenElement || document.webkitFullscreenElement;
    if (current === screen) { enteredFullscreen = true; return; }
    if (enteredFullscreen && active && performance.now() >= ignoreUntil) {
      active = false;
      if (hideTimer) clearTimeout(hideTimer);
      onExit("fullscreen");
    }
  };

  listen(document, "pointermove", onPointerMove, { capture: true, passive: true });
  listen(screen, "wheel", onWheel, { capture: true, passive: true });
  listen(screen, "touchstart", onTouchStart, { capture: true, passive: false });
  listen(document, "keydown", onKeyDown, { capture: true });
  listen(document, "fullscreenchange", onFullscreenChange);
  listen(document, "webkitfullscreenchange", onFullscreenChange);
  listen(closeButton, "click", onClose);

  return {
    showControls,
    ignoreUntil: () => ignoreUntil,
    destroy() {
      if (!active) active = false;
      if (hideTimer) clearTimeout(hideTimer);
      cleanup.splice(0).forEach(remove => remove());
      controls.classList.remove("is-visible");
      screen.classList.remove("cursor-visible");
    }
  };
}
