"use client";

/**
 * The sword-cut sound for SCROLL answers, synthesised with the Web Audio API so
 * it ships no audio file and never blocks a render.
 *
 * A cut is a fast band of noise sweeping downward — a "shing" — plus, for a
 * clean hit, a short rising tone that gives it the metallic ring. A wrong answer
 * gets a lower, duller strike. Kept short (~180ms) and quiet so it punctuates the
 * play rather than dominating it.
 *
 * One AudioContext, created lazily on the first cut (which is a click, so the
 * browser's autoplay gate is already satisfied) and reused. Under
 * prefers-reduced-motion we make no sound at all, matching the visuals.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function playSlash(kind: "clean" | "wrong"): void {
  const ac = audio();
  if (!ac) return;
  // A click may arrive before the context is running; nudge it awake.
  if (ac.state === "suspended") ac.resume().catch(() => {});

  const now = ac.currentTime;
  const dur = 0.18;

  try {
    // The whoosh: a burst of white noise pushed through a band-pass that sweeps
    // from bright to dark, which is what makes it read as a blade, not static.
    const frames = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const noise = ac.createBufferSource();
    noise.buffer = buffer;

    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.9;
    band.frequency.setValueAtTime(kind === "clean" ? 3600 : 1300, now);
    band.frequency.exponentialRampToValueAtTime(kind === "clean" ? 900 : 380, now + dur);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "clean" ? 0.45 : 0.55, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(band).connect(gain).connect(ac.destination);
    noise.start(now);
    noise.stop(now + dur);

    // The ring: a short rising tone on a clean cut only.
    if (kind === "clean") {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1700, now);
      osc.frequency.exponentialRampToValueAtTime(3300, now + 0.07);
      const ring = ac.createGain();
      ring.gain.setValueAtTime(0.0001, now);
      ring.gain.exponentialRampToValueAtTime(0.13, now + 0.01);
      ring.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      osc.connect(ring).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  } catch {
    // Audio is a flourish; never let it interrupt play.
  }
}
