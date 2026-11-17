import React from 'react';
import { useSpring } from '../hooks/useSpring';
import { TapeCursor } from '../lib/timeline';
import { charLabel } from '../lib/format';

const STRIDE = 64;
const RADIUS = 14;

interface Props {
  cursor: TapeCursor | null;
  count: number;
  ptr: number;
  cellSize: number;
  changedIndex: number | null;
  stateName: string;
  stale: boolean;
}

/**
 * La cinta se desplaza con un resorte crítico (sin rebote): el cabezal queda fijo
 * al centro y la cinta lo sigue. Si el cabezal salta de nuevo a mitad de camino,
 * el resorte parte de la posición y la velocidad actuales (interrumpible).
 */
export default function TapeStage({ cursor, count, ptr, cellSize, changedIndex, stateName, stale }: Props) {
  const pos = useSpring(ptr, { response: 0.42, damping: 1 });
  const base = Math.round(pos);
  const indices: number[] = [];
  for (let i = base - RADIUS; i <= base + RADIUS; i++) indices.push(i);
  const headValue = cursor ? cursor.get(ptr) : 0;

  return (
    <div className={`stage${stale ? ' is-stale' : ''}`}>
      <div className="stage-meta">
        <span className="state-pill" title="Estado actual de la máquina">{stateName}</span>
        <span className="muted">Cabezal en la celda <b className="num">{ptr}</b></span>
        <span className="muted stage-value">
          valor <b className="num">{headValue}</b>
          {headValue > 0 && <> · <b className="num">0x{headValue.toString(16).toUpperCase().padStart(2, '0')}</b> · <b className="num">{charLabel(headValue)}</b></>}
        </span>
      </div>
      <div className="tape" role="img" aria-label={`Cinta de la máquina. Cabezal en la celda ${ptr}, valor ${headValue}.`}>
        <div className="tape-head" aria-hidden="true" />
        {indices.map(i => {
          const v = cursor ? cursor.get(i) : 0;
          const changed = changedIndex === i;
          const style = {
            transform: `translate3d(${(i - pos) * STRIDE}px,0,0)`,
            '--v': cellSize > 1 ? v / (cellSize - 1) : 0,
          } as React.CSSProperties;
          return (
            <div
              key={changed ? `${i}-c${count}` : i}
              className={`tape-cell${i === ptr ? ' is-head' : ''}${v !== 0 ? ' is-set' : ''}${changed ? ' is-changed' : ''}`}
              style={style}
            >
              <span className="tape-value num">{v}</span>
              {v !== 0 && <span className="tape-char">{charLabel(v)}</span>}
              <span className="tape-index num">{i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
