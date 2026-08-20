import React from 'react';

interface ScanlineProps {
  active?: boolean;
  className?: string;
}

export const Scanline: React.FC<ScanlineProps> = ({ active = false, className = '' }) => {
  if (!active) return null;

  return (
    <div
      className={`scanline-sweep ${className}`}
      aria-hidden="true"
    />
  );
};
