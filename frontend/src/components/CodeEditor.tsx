import React, { useEffect, useMemo, useRef } from 'react';

type Mark = '' | 'cur' | 'last' | 'pair' | 'err';

interface Props {
  code: string;
  onChange: (code: string) => void;
  /** Posiciones (en runes) a resaltar; null cuando no hay ejecución vigente. */
  currentSrc: number | null;
  lastSrc: number | null;
  pairSrc: number | null;
  errorPos: number | null;
}

function opClass(ch: string): string {
  switch (ch) {
    case '>': case '<': return 'op-move';
    case '+': case '-': return 'op-math';
    case '[': case ']': return 'op-loop';
    case '.': case ',': return 'op-io';
    default: return 'cm';
  }
}

interface Segment { start: number; text: string; cls: string; mark: Mark }

function buildSegments(chars: string[], marks: Map<number, Mark>): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < chars.length) {
    const mark = marks.get(i) ?? '';
    const cls = opClass(chars[i]);
    if (mark !== '') {
      out.push({ start: i, text: chars[i], cls, mark });
      i++;
      continue;
    }
    let j = i + 1;
    while (j < chars.length && !marks.has(j) && opClass(chars[j]) === cls) j++;
    out.push({ start: i, text: chars.slice(i, j).join(''), cls, mark: '' });
    i = j;
  }
  return out;
}

export default function CodeEditor({ code, onChange, currentSrc, lastSrc, pairSrc, errorPos }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const curRef = useRef<HTMLSpanElement | null>(null);

  const segments = useMemo(() => {
    const chars = Array.from(code);
    const marks = new Map<number, Mark>();
    if (pairSrc !== null) marks.set(pairSrc, 'pair');
    if (lastSrc !== null) marks.set(lastSrc, 'last');
    if (currentSrc !== null) marks.set(currentSrc, 'cur');
    if (errorPos !== null && errorPos < chars.length) marks.set(errorPos, 'err');
    return buildSegments(chars, marks);
  }, [code, currentSrc, lastSrc, pairSrc, errorPos]);

  // Mantiene visible la instrucción actual mientras se reproduce.
  useEffect(() => {
    const el = curRef.current;
    const ta = taRef.current;
    const pre = preRef.current;
    if (!el || !ta || !pre) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < ta.scrollTop + 8) ta.scrollTop = Math.max(0, top - 40);
    else if (bottom > ta.scrollTop + ta.clientHeight - 8) ta.scrollTop = bottom - ta.clientHeight + 40;
    pre.scrollTop = ta.scrollTop;
  }, [currentSrc]);

  const syncScroll = () => {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  return (
    <div className="editor">
      <pre ref={preRef} className="editor-layer" aria-hidden="true">
        {segments.map(s => (
          <span
            key={s.start}
            ref={s.mark === 'cur' ? (el: HTMLSpanElement | null) => { curRef.current = el; } : undefined}
            className={`${s.cls}${s.mark ? ` mark-${s.mark}` : ''}`}
          >
            {s.text}
          </span>
        ))}
        {'\n'}
      </pre>
      <textarea
        ref={taRef}
        className="editor-input"
        value={code}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="Código Brainfuck"
        placeholder="Escribe código Brainfuck: > < + - [ ] . ,"
      />
    </div>
  );
}
