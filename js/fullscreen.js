export async function enterFullscreen(element) {
  const request = element?.requestFullscreen || element?.webkitRequestFullscreen || element?.webkitRequestFullScreen;
  if (!request) return false;
  try {
    await request.call(element, { navigationUI: "hide" });
    return true;
  } catch {
    try { await request.call(element); return true; } catch { return false; }
  }
}

export async function exitFullscreen() {
  const active = document.fullscreenElement || document.webkitFullscreenElement;
  if (!active) return false;
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen;
  if (!exit) return false;
  try { await exit.call(document); return true; } catch { return false; }
}

export function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

export async function requestWakeLock(enabled = true) {
  if (!enabled || !navigator.wakeLock?.request) return null;
  try { return await navigator.wakeLock.request("screen"); } catch { return null; }
}

export async function releaseWakeLock(lock) {
  if (!lock || lock.released) return;
  try { await lock.release(); } catch { /* lock may already have been released by the browser */ }
}
