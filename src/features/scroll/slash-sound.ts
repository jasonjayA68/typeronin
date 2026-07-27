"use client";

/**
 * The sword "shing" for SCROLL answers, synthesised with the Web Audio API so it
 * ships no audio file and never blocks a render.
 *
 * A metallic RING, not a whoosh: two bright, slightly detuned high tones with a
 * fast attack and a long ring-out — "shiiingg" — over a tiny high-passed noise
 * transient that gives the very start its edge. A clean pick rings high and
 * bright; a wrong pick rings lower and shorter. Kept quiet so it punctuates play
 * rather than dominates it.
 *
 * One AudioContext, created lazily on the first cut (a click, so the autoplay
 * gate is already satisfied) and reused. Silent under prefers-reduced-motion,
 * matching the visuals.
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
  const clean = kind === "clean";
  // Ring length — the "iiii" in shiiing. Longer for a clean hit.
  const ring = clean ? 0.42 : 0.28;

  try {
    // The metallic ring: two detuned high partials. Detuning is what turns a
    // plain tone into "metal"; sine keeps it a clear ring rather than a buzz.
    const base = clean ? 2900 : 1900;
    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(clean ? 0.34 : 0.4, now + 0.006);
    master.gain.exponentialRampToValueAtTime(0.0001, now + ring);
    master.connect(ac.destination);

    for (const mult of [1, 1.5]) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      const f = base * mult;
      // A quick upward glide into the note gives the "sh→ing" onset.
      osc.frequency.setValueAtTime(f * 0.86, now);
      osc.frequency.exponentialRampToValueAtTime(f, now + 0.05);
      const partial = ac.createGain();
      partial.gain.value = mult === 1 ? 1 : 0.5;
      osc.connect(partial).connect(master);
      osc.start(now);
      osc.stop(now + ring);
    }

    // A tiny high-passed noise transient at the very start — the "sh" edge of
    // the blade catching, ~25ms, quiet.
    const nDur = 0.03;
    const frames = Math.max(1, Math.floor(ac.sampleRate * nDur));
    const buffer = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 5000;
    const nGain = ac.createGain();
    nGain.gain.setValueAtTime(clean ? 0.18 : 0.14, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + nDur);
    noise.connect(hp).connect(nGain).connect(ac.destination);
    noise.start(now);
    noise.stop(now + nDur);
  } catch {
    // Audio is a flourish; never let it interrupt play.
  }
}
