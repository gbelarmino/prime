const MUTE_KEY = "aires:whatsapp-alert-muted";

export const WHATSAPP_INBOUND_ALERT_EVENT = "aires:whatsapp-msg-recebida";

export function isWhatsAppAlertMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setWhatsAppAlertMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent("aires:whatsapp-alert-mute-changed", { detail: { muted } }),
  );
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new Ctx();
  }
  return sharedAudioCtx;
}

/** Desbloqueia o AudioContext após gesto do utilizador (necessário em alguns browsers). */
export function unlockWhatsAppAlertAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
}

/** Tom curto via Web Audio (sem ficheiro estático). */
export function playWhatsAppInboundChime(): void {
  if (typeof window === "undefined" || isWhatsAppAlertMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, dur: number, gainPeak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };

    playTone(880, 0, 0.12, 0.18);
    playTone(1174.7, 0.11, 0.16, 0.14);
  } catch {
    /* Autoplay / AudioContext bloqueado — ignora */
  }
}

export function notifyWhatsAppInboundVisual(
  conversaId?: string | null,
  canal?: string | null,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WHATSAPP_INBOUND_ALERT_EVENT, {
      detail: {
        conversaId: conversaId ?? null,
        canal: canal ?? "WHATSAPP",
      },
    }),
  );
}
