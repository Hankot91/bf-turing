import React from 'react';
import { Step } from '../api';
import { OP_NAME, describeStep } from '../lib/format';

interface Props {
  step: Step | null;
  count: number;
  total: number;
  stateName: string;
}

export default function TransitionCard({ step, count, total, stateName }: Props) {
  if (!step) {
    return (
      <div className="delta-card">
        <div className="delta-title">Configuración inicial</div>
        <p className="muted">
          Estado <b className="num">{stateName}</b>, cabezal en 0 y cinta en blanco. Avanza para ver cada transición δ.
        </p>
      </div>
    );
  }
  const d = step.delta;
  return (
    <div className="delta-card">
      <div className="delta-head">
        <span className="op-badge" data-op={step.op}>{step.op}</span>
        <div>
          <div className="delta-title">{OP_NAME[step.op]}</div>
          <div className="muted small">
            Paso <span className="num">{count}</span> de <span className="num">{total}</span> · instrucción{' '}
            <span className="num">{step.pc}</span> · bucles anidados <span className="num">{step.loopDepth}</span>
          </div>
        </div>
      </div>
      <div className="delta-formula num" aria-label="Transición aplicada">
        <span className="t-fn">δ</span>(<span className="t-state">{d.from}</span>, <span className="t-sym">{d.read}</span>)
        <span className="t-eq"> = </span>(<span className="t-state">{d.to}</span>, <span className="t-sym">{d.write}</span>,{' '}
        <span className="t-move">{d.move}</span>)
      </div>
      <p className="delta-desc">{describeStep(step.op, d)}</p>
    </div>
  );
}
