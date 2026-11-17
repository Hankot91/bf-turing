import { Op, Status, Transition, Delta } from '../api';

/** Carácter legible para un valor de celda (los de control se muestran con símbolos). */
export function charLabel(code: number): string {
  if (code === 32) return '␠';
  if (code >= 33 && code <= 126) return String.fromCharCode(code);
  if (code >= 0 && code < 32) return String.fromCharCode(0x2400 + code);
  if (code === 127) return '␡';
  return '·';
}

export function visibleOutput(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (ch === '\n') out += '\n';
    else if (c < 32 || c === 127) out += charLabel(c);
    else out += ch;
  }
  return out;
}

export const OP_NAME: Record<Op, string> = {
  '>': 'Mover a la derecha',
  '<': 'Mover a la izquierda',
  '+': 'Incrementar la celda',
  '-': 'Decrementar la celda',
  '[': 'Inicio de bucle',
  ']': 'Fin de bucle',
  '.': 'Emitir salida',
  ',': 'Leer entrada',
};

export function describeStep(op: Op, d: Delta): string {
  switch (op) {
    case '>': return 'El cabezal avanza una celda a la derecha.';
    case '<': return 'El cabezal retrocede una celda a la izquierda.';
    case '+': return `La celda pasa de ${d.read} a ${d.write} (módulo del tamaño de celda).`;
    case '-': return `La celda pasa de ${d.read} a ${d.write} (módulo del tamaño de celda).`;
    case '[': return d.read === 0 ? 'La celda vale 0: salta después del ] correspondiente.' : 'La celda no es 0: entra al bucle.';
    case ']': return d.read !== 0 ? 'La celda no es 0: vuelve al inicio del bucle.' : 'La celda vale 0: sale del bucle.';
    case '.': return `Emite el carácter ${charLabel(d.read)} (código ${d.read}).`;
    case ',': return d.write === d.read ? 'No quedan datos de entrada: la celda queda en 0.' : `Lee un carácter de la entrada: la celda pasa a ${d.write}.`;
  }
}

export const STATUS_INFO: Record<Status, { label: string; tone: 'ok' | 'warn' | 'bad'; hint: string }> = {
  halted: { label: 'Terminó', tone: 'ok', hint: 'La máquina llegó al estado final qhalt.' },
  step_limit: {
    label: 'Límite de pasos',
    tone: 'warn',
    hint: 'Se alcanzó el máximo de pasos sin terminar. Puede ser un bucle infinito o un programa largo.',
  },
  cycle_detected: {
    label: 'Ciclo detectado',
    tone: 'bad',
    hint: 'Una configuración se repitió, así que la máquina nunca terminará. Es una heurística: el problema de la parada es indecidible en general.',
  },
  error: { label: 'Error', tone: 'bad', hint: '' },
};

export function transitionText(t: Transition): { read: string; write: string } {
  const read = String(t.read);
  let write = '';
  if (t.write.value !== undefined) write = String(t.write.value);
  else {
    const map = { inc: 'a+1', dec: 'a−1', keep: 'a', input: 'entrada' } as const;
    write = map[t.write.op ?? 'keep'];
  }
  return { read, write };
}

export function stateLabel(index: number): string {
  return index < 0 ? 'qhalt' : `q${index}`;
}
