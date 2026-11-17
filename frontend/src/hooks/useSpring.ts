import { useEffect, useRef, useState } from 'react';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Resorte crítico/subamortiguado con los parámetros de Apple:
 *  - damping: 1 = sin rebote; < 1 rebota.
 *  - response: segundos en alcanzar el objetivo (no es una duración fija).
 * Es interrumpible: al cambiar el objetivo parte del valor y la velocidad VIVOS,
 * así que nunca hay saltos ni «paredes» de velocidad.
 */
export function useSpring(target: number, { response = 0.4, damping = 1 } = {}): number {
  const [value, setValue] = useState(target);
  const state = useRef({ x: target, v: 0 });
  const goal = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    goal.current = target;
    if (prefersReducedMotion()) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      state.current = { x: target, v: 0 };
      setValue(target);
      return;
    }
    if (raf.current) return; // ya hay un bucle: tomará el nuevo objetivo
    const omega = (2 * Math.PI) / response;
    let last = performance.now();
    const tick = (now: number) => {
      let dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 240);
        const a = -omega * omega * (s.x - goal.current) - 2 * damping * omega * s.v;
        s.v += a * h;
        s.x += s.v * h;
        dt -= h;
      }
      if (Math.abs(s.x - goal.current) < 0.001 && Math.abs(s.v) < 0.01) {
        s.x = goal.current;
        s.v = 0;
        setValue(s.x);
        raf.current = 0;
        return;
      }
      setValue(s.x);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [target, response, damping]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return value;
}
