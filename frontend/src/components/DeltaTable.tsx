import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, Delta, ExportResponse, toApiError, Transition } from '../api';
import Segmented from './Segmented';
import { transitionText } from '../lib/format';

interface Props {
  code: string;
  cellSize: number;
  delta: Delta | null; // transición del paso actual (si hay ejecución vigente)
}

const WINDOW = 400;

function matches(t: Transition, d: Delta, mode: 'high' | 'pure'): boolean {
  if (t.from !== d.from) return false;
  if (mode === 'pure') return t.read === d.read;
  return t.read === '*' || (t.read === '0' && d.read === 0) || (t.read === '!0' && d.read !== 0);
}

export default function DeltaTable({ code, cellSize, delta }: Props) {
  const [mode, setMode] = useState<'high' | 'pure'>('high');
  const [k, setK] = useState(4);
  const [data, setData] = useState<ExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const reqCell = mode === 'pure' ? k : cellSize;

  useEffect(() => {
    const ac = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.exportTable({ code, mode, cellSize: reqCell }, ac.signal);
        setData(r);
        setError(null);
      } catch (e) {
        if (ac.signal.aborted) return;
        setData(null);
        setError(toApiError(e).message);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(id);
      ac.abort();
    };
  }, [code, mode, reqCell]);

  const activeIndex = useMemo(
    () => (data && delta ? data.transitions.findIndex(t => matches(t, delta, data.mode)) : -1),
    [data, delta],
  );

  const start = useMemo(() => {
    if (!data) return 0;
    const focus = activeIndex >= 0 ? activeIndex : 0;
    return Math.max(0, Math.min(data.transitions.length - WINDOW, focus - WINDOW / 2));
  }, [data, activeIndex]);

  useEffect(() => {
    rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const download = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `maquina-de-turing-${data.mode}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const rows = data ? data.transitions.slice(start, start + WINDOW) : [];

  return (
    <div className="table-view">
      <div className="table-tools">
        <Segmented
          label="Tipo de máquina"
          value={mode}
          onChange={setMode}
          options={[{ value: 'high', label: 'Alto nivel' }, { value: 'pure', label: 'Pura' }]}
        />
        {mode === 'pure' && (
          <div className="table-k">
            <span className="muted small">Alfabeto</span>
            <Segmented
              label="Tamaño del alfabeto"
              size="sm"
              value={k}
              onChange={setK}
              options={[2, 3, 4, 8, 16].map(n => ({ value: n, label: String(n) }))}
            />
          </div>
        )}
        <button className="btn ghost" onClick={download} disabled={!data}>Descargar JSON</button>
      </div>

      <p className="small muted">
        {mode === 'high'
          ? 'Alto nivel: la transición lleva una operación sobre el símbolo (a+1, a−1, a). Es una extensión práctica de la MT.'
          : `Pura: una transición por cada símbolo del alfabeto (0 a ${k - 1}) en cada estado, como en la definición formal de la 7-tupla.`}
      </p>

      {error && <div className="inline-error">{error}</div>}
      {data && (
        <>
          <div className="tuple num small">
            M = (Q, Σ, Γ, δ, q<sub>0</sub>, B, F) · |Q| = {data.states.length} · |Γ| = {data.alphabet.size} · B = {data.alphabet.blank} · F = {'{'}{data.accepting.join(', ')}{'}'}
          </div>
          <div className={`table-scroll${loading ? ' is-loading' : ''}`}>
            <table className="delta-table">
              <thead>
                <tr><th>Estado</th><th>Lee</th><th>Nuevo estado</th><th>Escribe</th><th>Mueve</th><th>E/S</th></tr>
              </thead>
              <tbody>
                {rows.map((t, i) => {
                  const idx = start + i;
                  const txt = transitionText(t);
                  const active = idx === activeIndex;
                  return (
                    <tr key={idx} ref={active ? rowRef : undefined} className={active ? 'is-active' : undefined}>
                      <td className="num">{t.from}</td>
                      <td className="num">{txt.read}</td>
                      <td className="num">{t.to}</td>
                      <td className="num">{txt.write}</td>
                      <td className="num">{t.move}</td>
                      <td className="num">{t.io === 'in' ? 'entrada' : t.io === 'out' ? 'salida' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.transitions.length > WINDOW && (
            <p className="small muted">
              Mostrando {rows.length} de {data.transitions.length} transiciones. Descarga el JSON para verlas todas.
            </p>
          )}
        </>
      )}
    </div>
  );
}
