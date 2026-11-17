import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiErrorBody, RunResponse, toApiError } from './api';
import CodeEditor from './components/CodeEditor';
import DeltaTable from './components/DeltaTable';
import OutputPanel from './components/OutputPanel';
import ResultBanner from './components/ResultBanner';
import Segmented from './components/Segmented';
import TapeStage from './components/TapeStage';
import Transport from './components/Transport';
import TransitionCard from './components/TransitionCard';
import { usePlayback } from './hooks/usePlayback';
import { EXAMPLES } from './lib/examples';
import { stateLabel } from './lib/format';
import { buildHistory, nextPcAt, outputAt, ptrAt, TapeCursor } from './lib/timeline';

interface RunState { response: RunResponse; code: string; input: string; cellSize: number }
type Syntax =
  | { kind: 'idle' }
  | { kind: 'ok'; instructions: number; loops: number }
  | { kind: 'error'; error: ApiErrorBody }
  | { kind: 'offline' };

const CELL_SIZES = [2, 4, 8, 16, 256];
const MAX_STEPS = [1000, 10000, 100000, 200000];
const ERROR_TITLE: Record<string, string> = {
  UNBALANCED_BRACKET: 'Corchete sin cerrar',
  UNEXPECTED_CLOSE: 'Corchete de cierre sobrante',
  INVALID_CELL_SIZE: 'Tamaño de celda no válido',
  INVALID_INPUT: 'Entrada no válida',
  INVALID_STEP_LIMIT: 'Límite de pasos no válido',
  STEP_LIMIT_TOO_HIGH: 'Límite de pasos demasiado alto',
  NETWORK_ERROR: 'Sin conexión con el servidor',
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export default function App() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [input, setInput] = useState('');
  const [cellSize, setCellSize] = useState(256);
  const [maxSteps, setMaxSteps] = useState(10000);
  const [run, setRun] = useState<RunState | null>(null);
  const [runError, setRunError] = useState<ApiErrorBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [syntax, setSyntax] = useState<Syntax>({ kind: 'idle' });
  const [view, setView] = useState<'exec' | 'table'>('exec');

  // ---- validación en línea (con la API), sin esperar a pulsar nada ----
  useEffect(() => {
    const ac = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await api.validate(code, ac.signal);
        setSyntax({ kind: 'ok', instructions: r.instructions.length, loops: r.bracketPairs.length });
      } catch (e) {
        if (ac.signal.aborted) return;
        const body = toApiError(e);
        setSyntax(body.position !== null ? { kind: 'error', error: body } : { kind: 'offline' });
      }
    }, 250);
    return () => {
      clearTimeout(id);
      ac.abort();
    };
  }, [code]);

  // ---- línea de tiempo ----
  const history = useMemo(() => (run ? buildHistory(run.response.steps) : null), [run]);
  const cursor = useMemo(() => (history ? new TapeCursor(history) : null), [history]);
  const total = history?.total ?? 0;
  if (cursor) cursor.moveTo(count); // idempotente: seguro en el render

  const fresh = !!run && run.code === code;
  const instructions = run?.response.program.instructions ?? [];
  const ptr = history ? ptrAt(history, count) : 0;
  const nextPc = history ? nextPcAt(history, count) : 0;
  const lastStep = history && count > 0 ? history.steps[count - 1] : null;
  const nextInstr = fresh && nextPc >= 0 ? instructions[nextPc] : undefined;
  const lastInstr = fresh && lastStep ? instructions[lastStep.pc] : undefined;
  const pairSrc = nextInstr && nextInstr.match !== null ? instructions[nextInstr.match].src : null;
  const errorPos =
    syntax.kind === 'error' ? syntax.error.position : runError && runError.position !== null ? runError.position : null;

  // ---- reproducción ----
  const stop = useCallback(() => setPlaying(false), []);
  usePlayback(playing, speed, total, count, setCount, stop);

  const seek = useCallback((n: number) => {
    setPlaying(false);
    setCount(Math.max(0, Math.min(total, n)));
  }, [total]);
  const step = useCallback((d: number) => {
    setPlaying(false);
    setCount(c => Math.max(0, Math.min(total, c + d)));
  }, [total]);
  const toggle = useCallback(() => {
    if (!history) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (count >= total) setCount(0);
    setPlaying(true);
  }, [history, playing, count, total]);

  const execute = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setRunError(null);
    try {
      const response = await api.run({ code, input, cellSize, maxSteps });
      setRun({ response, code, input, cellSize });
      setCount(0);
      setPlaying(response.steps.length > 0);
      setView('exec');
    } catch (e) {
      setRunError(toApiError(e));
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }, [loading, code, input, cellSize, maxSteps]);

  // ---- atajos de teclado (siempre con las funciones más recientes) ----
  const actions = useRef({ execute, toggle, step, seek, total });
  actions.current = { execute, toggle, step, seek, total };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = actions.current;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        a.execute();
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (e.key === ' ' && tag === 'BUTTON') return;
      const big = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); a.step(big); break;
        case 'ArrowLeft': e.preventDefault(); a.step(-big); break;
        case ' ': e.preventDefault(); a.toggle(); break;
        case 'Home': e.preventDefault(); a.seek(0); break;
        case 'End': e.preventDefault(); a.seek(a.total); break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleCode = (c: string) => {
    setCode(c);
    setRunError(null);
  };
  const loadExample = (id: string) => {
    const ex = EXAMPLES.find(x => x.id === id);
    if (!ex) return;
    setCode(ex.code);
    setInput(ex.input ?? '');
    if (ex.cellSize) setCellSize(ex.cellSize);
    if (ex.maxSteps) setMaxSteps(ex.maxSteps);
    setRunError(null);
    setPlaying(false);
  };

  const syntaxChip = (() => {
    switch (syntax.kind) {
      case 'ok':
        return <span className="chip tone-ok">✓ {syntax.instructions} instrucciones · {syntax.loops} {syntax.loops === 1 ? 'bucle' : 'bucles'}</span>;
      case 'error':
        return (
          <span className="chip tone-bad" title={syntax.error.message}>
            ✕ {ERROR_TITLE[syntax.error.code] ?? 'Error'} · línea {syntax.error.line}, col. {syntax.error.column}
          </span>
        );
      case 'offline':
        return <span className="chip tone-warn">Servidor sin conexión</span>;
      default:
        return null;
    }
  })();

  const exampleNote = EXAMPLES.find(x => x.code === code)?.note;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div>
            <h1>Brainfuck</h1>
            <p>Máquina de Turing</p>
          </div>
        </div>
        <div className="topbar-actions">
          <label className="select-wrap">
            <span className="sr-only">Ejemplos</span>
            <select value="" onChange={e => loadExample(e.target.value)} aria-label="Cargar un ejemplo">
              <option value="" disabled>Ejemplos</option>
              {EXAMPLES.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <button className="btn primary" onClick={execute} disabled={loading || syntax.kind === 'error'}>
            {loading ? 'Ejecutando…' : 'Ejecutar'}
            <kbd>{isMac ? '⌘↵' : 'Ctrl ↵'}</kbd>
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="col col-left" aria-label="Programa">
          <div className="card card-code">
            <div className="card-head">
              <h2>Código</h2>
              {syntaxChip}
            </div>
            <CodeEditor
              code={code}
              onChange={handleCode}
              currentSrc={nextInstr ? nextInstr.src : null}
              lastSrc={lastInstr ? lastInstr.src : null}
              pairSrc={pairSrc}
              errorPos={errorPos}
            />
            {exampleNote && <p className="small muted card-foot">{exampleNote}</p>}
          </div>

          <div className="card card-input">
            <div className="card-head"><h2>Entrada</h2></div>
            <textarea
              className="field"
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Texto que leerá el comando , (un carácter por vez)"
              spellCheck={false}
              aria-label="Entrada del programa"
            />
          </div>

          <div className="card card-settings">
            <div className="card-head"><h2>Ajustes</h2></div>
            <div className="setting">
              <div>
                <div className="setting-label">Valores por celda</div>
                <div className="small muted">Cada celda cuenta de 0 a {cellSize - 1} y da la vuelta.</div>
              </div>
              <Segmented label="Valores por celda" value={cellSize} onChange={setCellSize}
                options={CELL_SIZES.map(n => ({ value: n, label: String(n) }))} />
            </div>
            <div className="setting">
              <div>
                <div className="setting-label">Límite de pasos</div>
                <div className="small muted">Protege contra bucles infinitos.</div>
              </div>
              <Segmented label="Límite de pasos" value={maxSteps} onChange={setMaxSteps}
                options={MAX_STEPS.map(n => ({ value: n, label: n >= 1000 ? `${n / 1000}k` : String(n) }))} />
            </div>
          </div>
        </section>

        <section className="col col-run" aria-label="Ejecución">
          <div className="view-switch">
            <Segmented label="Vista" value={view} onChange={setView}
              options={[{ value: 'exec', label: 'Ejecución' }, { value: 'table', label: 'Tabla δ' }]} />
          </div>

          {runError && (
            <div className="banner tone-bad" role="alert">
              <b>{ERROR_TITLE[runError.code] ?? 'No se pudo ejecutar'}</b>
              <span>{runError.message}</span>
              {runError.line !== null && <span className="muted">Línea {runError.line}, columna {runError.column}.</span>}
            </div>
          )}

          {view === 'table' ? (
            <div className="card">
              <DeltaTable code={code} cellSize={cellSize} delta={fresh && lastStep ? lastStep.delta : null} />
            </div>
          ) : run && history ? (
            <>
              <div className="card stage-card">
                {!fresh && <div className="stale-note">El código cambió. Pulsa Ejecutar para actualizar.</div>}
                <TapeStage
                  cursor={cursor}
                  count={count}
                  ptr={ptr}
                  cellSize={run.cellSize}
                  changedIndex={lastStep?.write ? lastStep.write.index : null}
                  stateName={stateLabel(nextPc)}
                  stale={!fresh}
                />
              </div>
              <TransitionCard step={lastStep} count={count} total={total} stateName={stateLabel(nextPc)} />
              <div className="card">
                <div className="card-head"><h2>Salida</h2></div>
                <OutputPanel text={outputAt(history, count)} playing={playing} />
              </div>
              <ResultBanner result={run.response.result} />
            </>
          ) : (
            <div className="card empty">
              <div className="empty-tape" aria-hidden="true">
                {[0, 0, 0, 3, 0, 0, 0].map((v, i) => <span key={i} className={i === 3 ? 'is-head is-set' : ''}>{v}</span>)}
              </div>
              <h2 className="empty-title">Mira cómo piensa una máquina de Turing</h2>
              <p className="muted">
                Elige un ejemplo o escribe tu programa y pulsa <b>Ejecutar</b>. Verás la cinta, el cabezal y la
                transición δ de cada paso, y podrás retroceder en el tiempo.
              </p>
            </div>
          )}
        </section>
      </main>

      {run && history && total > 0 && (
        <Transport count={count} total={total} playing={playing} speed={speed}
          onSeek={seek} onStep={step} onToggle={toggle} onSpeed={setSpeed} />
      )}
    </div>
  );
}
