import React from 'react';

interface ImageGridProps {
  children: React.ReactNode;
}

export const ImageGrid: React.FC<ImageGridProps> = ({ children }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {children}
    </div>
  );
};
