import { Step } from '../api';

/**
 * Línea de tiempo de una ejecución. El contrato envía solo deltas (`write`),
 * así que para viajar en el tiempo se precalcula, en una pasada, el valor
 * anterior de cada escritura. Con eso, avanzar o retroceder N pasos cuesta O(N).
 */
export interface History {
  steps: Step[];
  total: number;
  olds: number[]; // valor de la celda antes del paso i (solo si hubo write)
  nextPc: number[]; // índice de la instrucción que ejecutará el paso i+1 (-1 = qhalt)
  outLen: number[]; // cantidad de caracteres emitidos hasta el paso i incluido
  outChars: string[];
}

export function stateIndex(name: string): number {
  return name === 'qhalt' ? -1 : Number(name.slice(1));
}

export function buildHistory(steps: Step[]): History {
  const cells = new Map<number, number>();
  const olds = new Array<number>(steps.length).fill(0);
  const nextPc = new Array<number>(steps.length);
  const outLen = new Array<number>(steps.length);
  const outChars: string[] = [];
  steps.forEach((s, i) => {
    if (s.write) {
      olds[i] = cells.get(s.write.index) ?? 0;
      if (s.write.value === 0) cells.delete(s.write.index);
      else cells.set(s.write.index, s.write.value);
    }
    if (s.output !== null) outChars.push(s.output);
    outLen[i] = outChars.length;
    nextPc[i] = stateIndex(s.delta.to);
  });
  return { steps, total: steps.length, olds, nextPc, outLen, outChars };
}

/** Cinta en un instante: se mueve incrementalmente hacia adelante o atrás. */
export class TapeCursor {
  private cells = new Map<number, number>();
  private pos = 0; // pasos ejecutados
  constructor(private h: History) {}

  private apply(index: number, value: number) {
    if (value === 0) this.cells.delete(index);
    else this.cells.set(index, value);
  }

  moveTo(target: number): this {
    const t = Math.max(0, Math.min(this.h.total, target));
    while (this.pos < t) {
      const w = this.h.steps[this.pos].write;
      if (w) this.apply(w.index, w.value);
      this.pos++;
    }
    while (this.pos > t) {
      this.pos--;
      const w = this.h.steps[this.pos].write;
      if (w) this.apply(w.index, this.h.olds[this.pos]);
    }
    return this;
  }

  get(index: number): number {
    return this.cells.get(index) ?? 0;
  }

  /** Extensión: celdas no nulas más la del cabezal (misma definición que result.finalTape). */
  extent(ptr: number): { offset: number; cells: number[] } {
    let lo = ptr;
    let hi = ptr;
    this.cells.forEach((_, k) => {
      if (k < lo) lo = k;
      if (k > hi) hi = k;
    });
    const cells: number[] = [];
    for (let i = lo; i <= hi; i++) cells.push(this.get(i));
    return { offset: lo, cells };
  }
}

export function ptrAt(h: History, count: number): number {
  return count === 0 ? 0 : h.steps[count - 1].ptr;
}
export function nextPcAt(h: History, count: number): number {
  return count === 0 ? 0 : h.nextPc[count - 1];
}
export function outputAt(h: History, count: number): string {
  const n = count === 0 ? 0 : h.outLen[count - 1];
  return h.outChars.slice(0, n).join('');
}
