import React from 'react';

type DotColor = 'green' | 'yellow' | 'red';

interface HudTagProps {
  dot?: DotColor | false;
  className?: string;
  children: React.ReactNode;
}

const dotColors: Record<DotColor, string> = {
  green: 'bg-success shadow-[0_0_6px_var(--color-success)]',
  yellow: 'bg-brand-yellow shadow-[0_0_6px_var(--color-brand-yellow)]',
  red: 'bg-danger shadow-[0_0_6px_var(--color-danger)]',
};

export const HudTag: React.FC<HudTagProps> = ({ dot = false, className = '', children }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.04em] uppercase text-brand-yellow bg-brand-yellow/[0.08] border border-brand-yellow/25 px-2.5 py-1 rounded-md ${className}`}
    >
      {dot && <span className={`w-[5px] h-[5px] rounded-full ${dotColors[dot]}`} />}
      {children}
    </span>
  );
};
