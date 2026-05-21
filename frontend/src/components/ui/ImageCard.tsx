import React from 'react';
import { Card } from './Card';

interface ImageCardProps {
  url: string;
  alt?: string;
  onClick?: () => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ url, alt = 'Event image', onClick }) => {
  return (
    <Card hoverable={!!onClick} onClick={onClick} className="aspect-square bg-gray-100 relative group overflow-hidden">
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </Card>
  );
};
