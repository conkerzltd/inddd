/**
 * Professional queue‑management chime using the Web Audio API.
 * Works fully offline – no external files required.
 * Produces a two‑tone "ding‑dong" similar to airport / metro announcements.
 */

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playQueueChime() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35, now);
    masterGain.connect(ctx.destination);

    // --- Tone 1: high note ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(830, now);          // ~G#5
    gain1.gain.setValueAtTime(0.6, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // --- Tone 2: lower note (a perfect fourth below) ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(622, now + 0.25);   // ~D#5
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.setValueAtTime(0.5, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.9);

    // Cleanup
    setTimeout(() => {
      osc1.disconnect();
      osc2.disconnect();
      gain1.disconnect();
      gain2.disconnect();
      masterGain.disconnect();
    }, 1200);
  } catch {
    // Silently fail if AudioContext is unavailable
  }
}
