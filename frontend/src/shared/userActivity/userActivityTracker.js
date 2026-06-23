import { sendActivityHeartbeat } from "../../api/userActivityApi";
import { getRuntimeAuthToken } from "../../api/runtimeAuthToken.js";

const PRESENCE_HEARTBEAT_INTERVAL_MS = 30_000;
const SIGNAL_MIN_INTERVAL_MS = 3_000;
const MOUSEMOVE_THROTTLE_MS = 5_000;

let started = false;
let lastSentAt = 0;
let lastMouseMoveAt = 0;
let pendingSource = "unknown";
let flushTimer = null;
let presenceTimer = null;

function resolveTenantIdFromPath(pathname = window.location.pathname) {
  const portalMatch = pathname.match(/\/portal\/(\d+)/);
  if (portalMatch) {
    return Number(portalMatch[1]);
  }

  const designerMatch = pathname.match(/\/designer\/tenant\/(\d+)/);
  if (designerMatch) {
    return Number(designerMatch[1]);
  }

  return null;
}

function scheduleHeartbeat(source = "unknown") {
  pendingSource = source;
  if (flushTimer) {
    return;
  }

  const now = Date.now();
  const elapsed = now - lastSentAt;
  const delay = elapsed >= SIGNAL_MIN_INTERVAL_MS ? 0 : SIGNAL_MIN_INTERVAL_MS - elapsed;

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushHeartbeat();
  }, delay);
}

async function flushHeartbeat() {
  if (!started) {
    return;
  }

  const { token } = getRuntimeAuthToken();
  if (!token) {
    return;
  }

  lastSentAt = Date.now();

  try {
    await sendActivityHeartbeat({
      tenant_id: resolveTenantIdFromPath(),
      source: pendingSource,
    });
  } catch {
    // Presence tracking must not break the app.
  }
}

function handleActivity(source) {
  if (!started) {
    return;
  }
  scheduleHeartbeat(source);
}

function startPresenceLoop() {
  if (presenceTimer) {
    window.clearInterval(presenceTimer);
  }
  presenceTimer = window.setInterval(() => {
    handleActivity("heartbeat");
  }, PRESENCE_HEARTBEAT_INTERVAL_MS);
}

function onMouseMove() {
  const now = Date.now();
  if (now - lastMouseMoveAt < MOUSEMOVE_THROTTLE_MS) {
    return;
  }
  lastMouseMoveAt = now;
  handleActivity("mousemove");
}

export function startUserActivityTracking() {
  if (started || typeof window === "undefined") {
    return;
  }

  started = true;
  startPresenceLoop();

  window.addEventListener("click", () => handleActivity("click"), { passive: true });
  window.addEventListener("dblclick", () => handleActivity("dblclick"), { passive: true });
  window.addEventListener("keydown", () => handleActivity("keypress"), { passive: true });
  window.addEventListener("input", () => handleActivity("input"), { passive: true });
  window.addEventListener("submit", () => handleActivity("submit"), { passive: true });
  window.addEventListener("scroll", () => handleActivity("scroll"), { passive: true });
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("focus", () => handleActivity("heartbeat"), { passive: true });

  handleActivity("heartbeat");
}

export function stopUserActivityTracking() {
  started = false;
  if (presenceTimer) {
    window.clearInterval(presenceTimer);
    presenceTimer = null;
  }
  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
}

export function recordNavigationActivity() {
  handleActivity("navigation");
}

export function recordApiActivity() {
  handleActivity("presence_ping");
}

export function resolveTenantIdFromLocation(pathname) {
  return resolveTenantIdFromPath(pathname);
}
