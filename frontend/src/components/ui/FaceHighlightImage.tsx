import React, { useState, useRef, useEffect } from 'react';
import type { FaceBoundingBox } from '../../types';

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
    <div className="relative inline-block max-w-full">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Analyzed"
        onLoad={handleImageLoad}
        className="max-w-full rounded-xl block"
        loading="lazy"
      />
      {imageLoaded && faces.map((face, index) => (
        <div
          key={index}
          className="absolute border-2 border-[#FFD600] bg-[#FFD600]/30 pointer-events-none transition-all duration-200"
          style={{
            left: `${face.x * scaleX}px`,
            top: `${face.y * scaleY}px`,
            width: `${face.width * scaleX}px`,
            height: `${face.height * scaleY}px`,
          }}
        />
      ))}
    </div>
  );
};
