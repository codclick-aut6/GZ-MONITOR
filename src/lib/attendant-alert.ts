// Browser alert helpers: sound (Web Audio, unlocked on first user gesture) + desktop notification.
let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* ignore */
  }
}

export function playAlertSound() {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  [0, 0.25, 0.5].forEach((offset, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 2 ? 1175 : 880;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.22);
  });
}

export function requestNotificationPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") void Notification.requestPermission();
}

export function showDesktopNotification(title: string, body: string, onClick?: () => void) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, tag: title + body, requireInteraction: true });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function isHumanRequest(s: { status: string; assigned_to: string | null } | null | undefined) {
  return !!s && s.status === "paused" && !s.assigned_to;
}
