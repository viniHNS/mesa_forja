const active = new Set();

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function tween({ duration = 400, delay = 0, easing = ease.outCubic, onStart, onUpdate, onComplete }) {
  const t = {
    start: performance.now() + delay,
    duration: reducedMotion() ? 1 : duration,
    easing,
    started: false,
    cancel() {
      active.delete(t);
    },
    finish() {
      active.delete(t);
      if (!t.started) onStart?.();
      onUpdate?.(1, 1);
      onComplete?.();
    },
  };
  t.onStart = onStart;
  t.onUpdate = onUpdate;
  t.onComplete = onComplete;
  active.add(t);
  return t;
}

export function tickTweens(now = performance.now()) {
  for (const t of [...active]) {
    if (now < t.start) continue;
    if (!t.started) {
      t.started = true;
      t.onStart?.();
    }
    const p = Math.min(1, (now - t.start) / t.duration);
    t.onUpdate?.(t.easing(p), p);
    if (p >= 1) {
      active.delete(t);
      t.onComplete?.();
    }
  }
}
