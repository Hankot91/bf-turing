import React from 'react';

interface Props<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}

/** Control segmentado: la selección se refleja al presionar (sin esperar a soltar). */
export default function Segmented<T extends string | number>({ label, options, value, onChange, size = 'md' }: Props<T>) {
  const index = Math.max(0, options.findIndex(o => o.value === value));
  const style = { '--n': options.length, '--i': index } as React.CSSProperties;
  return (
    <div className={`seg seg-${size}`} role="radiogroup" aria-label={label} style={style}>
      <span className="seg-thumb" aria-hidden="true" />
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="seg-item"
          onPointerDown={e => {
            if (e.button === 0) onChange(o.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChange(o.value);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
