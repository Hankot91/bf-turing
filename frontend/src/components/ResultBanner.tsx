import React from 'react';
import { RunResponse } from '../api';
import { STATUS_INFO } from '../lib/format';

export default function ResultBanner({ result }: { result: RunResponse['result'] }) {
  const info = STATUS_INFO[result.status];
  return (
    <div className={`result tone-${info.tone}`}>
      <div className="result-main">
        <span className="dot" aria-hidden="true" />
        <b>{info.label}</b>
        <span className="muted">
          · <span className="num">{result.totalSteps.toLocaleString('es')}</span> pasos
          {result.status === 'cycle_detected' && result.cycleFrom !== undefined && (
            <> · la configuración del paso <span className="num">{result.cycleFrom}</span> se repite</>
          )}
        </span>
      </div>
      {info.hint && <p className="small muted">{info.hint}</p>}
    </div>
  );
}
