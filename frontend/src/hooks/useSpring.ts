import { useEffect, useRef, useState } from 'react';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Resorte crítico/subamortiguado con los parámetros de Apple:
 *  - damping: 1 = sin rebote; < 1 rebota.
 *  - response: segundos en alcanzar el objetivo (no es una duración fija).
 * Es interrumpible: al cambiar el objetivo parte del valor y la velocidad VIVOS
 * (guardados en una ref), así que nunca hay saltos ni «paredes» de velocidad.
 *
 * Cada vez que cambia el objetivo se cancela el bucle anterior y se inicia uno nuevo.
 * Así el efecto es seguro bajo React.StrictMode (que en desarrollo monta, desmonta y
 * vuelve a montar): no depende de ninguna bandera que sobreviva a la limpieza.
 */
export function useSpring(target: number, { response = 0.4, damping = 1 } = {}): number {
  const [value, setValue] = useState(target);
  const state = useRef({ x: target, v: 0 });

  useEffect(() => {
    if (prefersReducedMotion()) {
      state.current = { x: target, v: 0 };
      setValue(target);
      return;
    }
    const omega = (2 * Math.PI) / response;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      let dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 240);
        const a = -omega * omega * (s.x - target) - 2 * damping * omega * s.v;
        s.v += a * h;
        s.x += s.v * h;
        dt -= h;
      }
      if (Math.abs(s.x - target) < 0.001 && Math.abs(s.v) < 0.01) {
        s.x = target;
        s.v = 0;
        setValue(target);
        return; // asentado: no se reprograma
      }
      setValue(s.x);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, response, damping]);

  return value;
}