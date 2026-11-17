import React from 'react';
import Segmented from './Segmented';

const SPEEDS = [2, 10, 50, 250, 1000];

interface Props {
  count: number;
  total: number;
  playing: boolean;
  speed: number;
  onSeek: (n: number) => void;
  onStep: (delta: number) => void;
  onToggle: () => void;
  onSpeed: (s: number) => void;
}

const I = {
  first: <path d="M6 5v14M18 6.5v11a.8.8 0 0 1-1.25.66l-8.2-5.5a.8.8 0 0 1 0-1.32l8.2-5.5A.8.8 0 0 1 18 6.5Z" />,
  back: <path d="M17.5 6.4v11.2a.8.8 0 0 1-1.25.66l-8.4-5.6a.8.8 0 0 1 0-1.32l8.4-5.6a.8.8 0 0 1 1.25.66Z" />,
  play: <path d="M8 5.6v12.8a.8.8 0 0 0 1.22.68l10.1-6.4a.8.8 0 0 0 0-1.36L9.22 4.92A.8.8 0 0 0 8 5.6Z" />,
  pause: <path d="M8 5.5v13M16 5.5v13" strokeLinecap="round" strokeWidth="3.2" />,
  fwd: <path d="M6.5 6.4v11.2a.8.8 0 0 0 1.25.66l8.4-5.6a.8.8 0 0 0 0-1.32l-8.4-5.6a.8.8 0 0 0-1.25.66Z" />,
  last: <path d="M18 5v14M6 6.5v11a.8.8 0 0 0 1.25.66l8.2-5.5a.8.8 0 0 0 0-1.32l-8.2-5.5A.8.8 0 0 0 6 6.5Z" />,
};

function Icon({ name }: { name: keyof typeof I }) {
  const stroke = name === 'pause' || name === 'first' || name === 'last';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill={name === 'pause' ? 'none' : 'currentColor'}
      stroke={stroke ? 'currentColor' : 'none'} strokeWidth={name === 'pause' ? undefined : 2.4} strokeLinejoin="round">
      {I[name]}
    </svg>
  );
}

/** Controles flotantes sobre un material translúcido; cada botón responde al presionar. */
export default function Transport({ count, total, playing, speed, onSeek, onStep, onToggle, onSpeed }: Props) {
  const progress = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="dock" role="toolbar" aria-label="Controles de ejecución">
      <div className="dock-row">
        <button className="icon-btn" onClick={() => onSeek(0)} disabled={count === 0} aria-label="Ir al inicio" title="Inicio (Inicio)">
          <Icon name="first" />
        </button>
        <button className="icon-btn" onClick={() => onStep(-1)} disabled={count === 0} aria-label="Paso atrás" title="Paso atrás (←)">
          <Icon name="back" />
        </button>
        <button className="icon-btn primary" onClick={onToggle} aria-label={playing ? 'Pausar' : 'Reproducir'} title="Reproducir / pausar (Espacio)">
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <button className="icon-btn" onClick={() => onStep(1)} disabled={count >= total} aria-label="Paso adelante" title="Paso adelante (→)">
          <Icon name="fwd" />
        </button>
        <button className="icon-btn" onClick={() => onSeek(total)} disabled={count >= total} aria-label="Ir al final" title="Final (Fin)">
          <Icon name="last" />
        </button>
        <div className="dock-count num" aria-live="off">
          {count.toLocaleString('es')}<span className="muted"> / {total.toLocaleString('es')}</span>
        </div>
      </div>
      <input
        className="scrubber"
        type="range"
        min={0}
        max={total}
        value={count}
        style={{ '--p': `${progress}%` } as React.CSSProperties}
        onChange={e => onSeek(Number(e.target.value))}
        aria-label="Paso de la ejecución"
      />
      <div className="dock-speed">
        <span className="muted small">Velocidad</span>
        <Segmented
          label="Velocidad de reproducción"
          size="sm"
          value={speed}
          onChange={onSpeed}
          options={SPEEDS.map(s => ({ value: s, label: `${s}/s` }))}
        />
      </div>
    </div>
  );
}
