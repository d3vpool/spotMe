import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  reticle?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, reticle = false, className = '', ...props }) => {
  return (
    <div
      className={`bg-surface-dark/40 backdrop-blur-sm border border-border-dark rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.24)] ${
        hoverable ? 'transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:border-brand-yellow/30 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {reticle ? (
        <div className="relative">
          <span className="rt-corner rt-tl" />
          <span className="rt-corner rt-tr" />
          <span className="rt-corner rt-bl" />
          <span className="rt-corner rt-br" />
          {children}
        </div>
      ) : children}
    </div>
  );
};
