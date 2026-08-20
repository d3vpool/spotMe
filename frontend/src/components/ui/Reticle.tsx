import React from 'react';

interface ReticleProps {
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Reticle: React.FC<ReticleProps> = ({ active = false, className = '', children }) => {
  return (
    <div className={`relative ${active ? 'reticle-active' : ''} ${className}`}>
      <span className="rt-corner rt-tl" />
      <span className="rt-corner rt-tr" />
      <span className="rt-corner rt-bl" />
      <span className="rt-corner rt-br" />
      {children}
    </div>
  );
};
