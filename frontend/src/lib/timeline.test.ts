import fs from 'fs';
import path from 'path';
import { RunResponse } from '../api';
import { charLabel, visibleOutput } from './format';
import { buildHistory, nextPcAt, outputAt, ptrAt, TapeCursor } from './timeline';

const DIR = path.join(__dirname, '../../../docs/ejemplos');
const goldens = fs
  .readdirSync(DIR)
  .filter(f => f.startsWith('run-'))
  .map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')))
  .filter(g => g.httpStatus === 200) as { name: string; response: RunResponse }[];

describe('línea de tiempo sobre los golden files', () => {
  test('hay ejemplos que probar', () => expect(goldens.length).toBeGreaterThan(5));

  test.each(goldens.map(g => [g.name, g] as const))('%s: la cinta reconstruida coincide con finalTape', (_n, g) => {
    const h = buildHistory(g.response.steps);
    const cursor = new TapeCursor(h).moveTo(h.total);
    expect(cursor.extent(g.response.result.finalPtr)).toEqual(g.response.result.finalTape);
    expect(ptrAt(h, h.total)).toBe(g.response.result.finalPtr);
    expect(outputAt(h, h.total)).toBe(g.response.result.output);
  });

  test.each(goldens.map(g => [g.name, g] as const))('%s: ir y volver en el tiempo es exacto', (_n, g) => {
    const h = buildHistory(g.response.steps);
    const cursor = new TapeCursor(h);
    const targets = [h.total, 0, Math.floor(h.total / 2), h.total, 1, Math.floor(h.total / 3), 0];
    for (const t of targets) {
      cursor.moveTo(t);
      const fresh = new TapeCursor(h).moveTo(t); // reconstrucción desde cero
      const p = ptrAt(h, t);
      expect(cursor.extent(p)).toEqual(fresh.extent(p));
    }
    expect(cursor.moveTo(0).extent(0)).toEqual({ offset: 0, cells: [0] });
  });

  test('nextPc apunta a la instrucción siguiente o a qhalt (-1)', () => {
    const g = goldens.find(x => x.name === 'run-cero')!;
    const h = buildHistory(g.response.steps);
    expect(nextPcAt(h, 0)).toBe(0);
    expect(nextPcAt(h, h.total)).toBe(-1);
  });

  test('la salida avanza con los pasos', () => {
    const g = goldens.find(x => x.name === 'run-hello')!;
    const h = buildHistory(g.response.steps);
    expect(outputAt(h, 0)).toBe('');
    expect(outputAt(h, h.total)).toBe('Hi');
  });
});

describe('formato', () => {
  test('caracteres de control legibles', () => {
    expect(charLabel(0)).toBe('␀');
    expect(charLabel(10)).toBe('␊');
    expect(charLabel(32)).toBe('␠');
    expect(charLabel(72)).toBe('H');
    expect(visibleOutput('a\nb')).toBe('a\nb');
    expect(visibleOutput('\u0000')).toBe('␀');
  });
});
