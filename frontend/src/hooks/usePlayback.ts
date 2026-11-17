import { useEffect, useRef } from 'react';

/** Reproduce pasos a `speed` pasos/segundo, sincronizado con la pantalla (rAF). */
export function usePlayback(
  playing: boolean,
  speed: number,
  total: number,
  count: number,
  setCount: (n: number) => void,
  stop: () => void,
) {
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      acc += ((now - last) / 1000) * speed;
      last = now;
      const whole = Math.floor(acc);
      if (whole > 0) {
        acc -= whole;
        const next = Math.min(total, countRef.current + whole);
        countRef.current = next;
        setCount(next);
        if (next >= total) {
          stop();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, total, setCount, stop]);
}
