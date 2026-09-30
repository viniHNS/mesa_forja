const active = new Set();

export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Devolve um handle com cancel(). Quem guarda o handle deve cancelar o anterior antes de
// iniciar outro que escreve nas mesmas propriedades.
export function tween({ duration = 400, delay = 0, easing = ease.outCubic, onStart, onUpdate, onComplete }) {
  // com movimento reduzido tudo termina no próximo frame, inclusive o atraso (senão a
  // montagem continuaria escalonada, só que aos saltos)
  const reduce = reducedMotion();
  const t = {
    start: performance.now() + (reduce ? 0 : delay),
    duration: reduce ? 1 : duration,
    easing,
    started: false,
    cancel() {
      active.delete(t);
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
    // um onUpdate/onComplete anterior pode ter cancelado este tween no mesmo frame
    if (!active.has(t) || now < t.start) continue;
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
