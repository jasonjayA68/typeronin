"use client";

/**
 * The sound of a katana hitting something HARD, synthesised with the Web Audio
 * API so it ships no audio file and never blocks a render.
 *
 * A strike, not a swing. A whoosh is the sound of a blade meeting nothing, and
 * that is what the old version was — a pure ring with no moment of contact, so
 * the answer card was never really struck. A hard hit is three things arriving
 * in the same instant, and the order matters more than any one of them:
 *
 *   1. the CONTACT — a few milliseconds of bright noise, the crack of edge
 *      against a hard surface. This is what tells the ear something was hit;
 *   2. the BODY — a low tone dropping in pitch and dying fast, the weight of
 *      the thing that took the blow;
 *   3. the RING — the steel itself, still singing after contact. Its partials
 *      are inharmonic (bell ratios, not octaves), which is the whole reason it
 *      reads as metal instead of a drum or a beep.
 *
 * A clean pick lands square: brighter contact, higher steel, a long ring-out. A
 * wrong pick is a blocked hit: lower, duller, more thud than ring, over quickly.
 * Kept quiet so it punctuates play rather than dominates it.
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

/**
 * The steel. Ratios are taken from struck metal rather than a harmonic series —
 * a plain 1:2:3 stack sounds like an organ. Higher partials are quieter but
 * ring LONGER, which is why a struck blade brightens as it decays.
 */
const PARTIALS = [
  { ratio: 1, gain: 0.5, decay: 0.5 },
  { ratio: 2.76, gain: 0.34, decay: 0.72 },
  { ratio: 5.4, gain: 0.22, decay: 1 },
  { ratio: 8.93, gain: 0.12, decay: 0.88 },
];

/** White noise of a given length — the raw material of the contact crack. */
function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const frames = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function playSlash(kind: "clean" | "wrong"): void {
  const ac = audio();
  if (!ac) return;
  // A click may arrive before the context is running; nudge it awake.
  if (ac.state === "suspended") ac.resume().catch(() => {});

  const now = ac.currentTime;
  const clean = kind === "clean";
  // How long the steel sings. A clean hit rings; a blocked one is swallowed.
  const ring = clean ? 0.7 : 0.34;

  try {
    const out = ac.createGain();
    out.gain.value = 0.5;
    out.connect(ac.destination);

    // 1. CONTACT — the crack. Two noise bursts: a band around the impact's
    // pitch for the "thock" of the surface, and a very short high one for the
    // edge itself. Both are over in under 30ms; any longer and a strike turns
    // into a sizzle.
    const crackDur = 0.045;
    const crack = ac.createBufferSource();
    crack.buffer = noiseBuffer(ac, crackDur);
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = clean ? 2600 : 1500;
    band.Q.value = 1.1;
    const crackGain = ac.createGain();
    crackGain.gain.setValueAtTime(clean ? 0.32 : 0.4, now);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + crackDur);
    crack.connect(band).connect(crackGain).connect(out);
    crack.start(now);
    crack.stop(now + crackDur);

    const tickDur = 0.012;
    const tick = ac.createBufferSource();
    tick.buffer = noiseBuffer(ac, tickDur);
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6500;
    const tickGain = ac.createGain();
    tickGain.gain.setValueAtTime(clean ? 0.26 : 0.19, now);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, now + tickDur);
    tick.connect(hp).connect(tickGain).connect(out);
    tick.start(now);
    tick.stop(now + tickDur);

    // 2. BODY — what was hit. A low tone falling in pitch as it dies is the
    // sound of mass absorbing a blow; without it the strike floats and could be
    // happening to nothing. Heavier and lower for the blocked hit.
    const thudDur = clean ? 0.11 : 0.16;
    const thud = ac.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(clean ? 190 : 150, now);
    thud.frequency.exponentialRampToValueAtTime(clean ? 72 : 55, now + thudDur);
    const thudGain = ac.createGain();
    thudGain.gain.setValueAtTime(0.0001, now);
    thudGain.gain.exponentialRampToValueAtTime(clean ? 0.3 : 0.42, now + 0.004);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + thudDur);
    thud.connect(thudGain).connect(out);
    thud.start(now);
    thud.stop(now + thudDur);

    // 3. RING — the blade. Attack is 3ms because steel does not fade in; the
    // note is simply there the instant the edge lands.
    //
    // The decay lands on a small fraction of the peak rather than on silence,
    // then a short linear ramp takes it the rest of the way. An exponential run
    // all the way down to zero spends most of its length inaudible: the ring
    // measured barely a third of its nominal life, so the strike swallowed the
    // steel and what was left sounded like a knock on wood.
    const base = clean ? 620 : 430;
    const peak = clean ? 0.5 : 0.36;
    for (const { ratio, gain, decay } of PARTIALS) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = base * ratio;
      const life = ring * decay;
      const level = gain * peak;
      const env = ac.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(level, now + 0.003);
      env.gain.exponentialRampToValueAtTime(level * 0.02, now + life);
      env.gain.linearRampToValueAtTime(0, now + life + 0.04);
      osc.connect(env).connect(out);
      osc.start(now);
      osc.stop(now + life + 0.04);
    }
  } catch {
    // Audio is a flourish; never let it interrupt play.
  }
}
