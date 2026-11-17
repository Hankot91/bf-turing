import React from 'react';
import { visibleOutput } from '../lib/format';

export default function OutputPanel({ text, playing }: { text: string; playing: boolean }) {
  return (
    <div className="output">
      <pre className="output-text" aria-live="off">
        {text ? visibleOutput(text) : <span className="muted">La salida del programa aparecerá aquí.</span>}
        {playing && text && <span className="caret" aria-hidden="true" />}
      </pre>
    </div>
  );
}
