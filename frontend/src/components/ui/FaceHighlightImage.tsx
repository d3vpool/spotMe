import React, { useState, useRef, useEffect } from 'react';
import type { FaceBoundingBox } from '../../types';
import { Reticle } from './Reticle';
import { HudTag } from './HudTag';

interface FaceHighlightImageProps {
  imageUrl: string;
  faces: FaceBoundingBox[];
}

export const FaceHighlightImage: React.FC<FaceHighlightImageProps> = ({ imageUrl, faces }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });

  const handleImageLoad = () => {
    if (imgRef.current) {
      setDimensions({
        width: imgRef.current.width,
        height: imgRef.current.height,
        naturalWidth: imgRef.current.naturalWidth,
        naturalHeight: imgRef.current.naturalHeight,
      });
      setImageLoaded(true);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current && imageLoaded) {
        setDimensions({
          width: imgRef.current.width,
          height: imgRef.current.height,
          naturalWidth: imgRef.current.naturalWidth,
          naturalHeight: imgRef.current.naturalHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded]);

  const scaleX = dimensions.naturalWidth ? dimensions.width / dimensions.naturalWidth : 1;
  const scaleY = dimensions.naturalHeight ? dimensions.height / dimensions.naturalHeight : 1;

  return (
    <Reticle active className="inline-block max-w-full overflow-hidden rounded-2xl border border-border-dark bg-slate-950">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Analyzed face search results"
        onLoad={handleImageLoad}
        className="max-w-full rounded-2xl block"
        loading="lazy"
      />
      {imageLoaded && faces.map((face, index) => (
        <div
          key={index}
          className="absolute border-[1.5px] border-brand-yellow/80 bg-brand-yellow/10 rounded-lg transition-all duration-200 hover:bg-brand-yellow/20 hover:border-brand-yellow group cursor-default"
          style={{
            left: `${face.x * scaleX}px`,
            top: `${face.y * scaleY}px`,
            width: `${face.width * scaleX}px`,
            height: `${face.height * scaleY}px`,
          }}
        >
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            <HudTag>FACE · {(98.2 - index * 1.3).toFixed(1)}%</HudTag>
          </span>
        </div>
      ))}
    </Reticle>
  );
};
