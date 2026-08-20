import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Reticle } from './Reticle';
import { Scanline } from './Scanline';

interface FileUploadBoxProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
}

export const FileUploadBox: React.FC<FileUploadBoxProps> = ({ onFilesSelected, multiple = false, accept = 'image/*' }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(multiple ? filesArray : [filesArray[0]]);
      e.dataTransfer.clearData();
    }
  }, [multiple, onFilesSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(multiple ? filesArray : [filesArray[0]]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Reticle
      active={isDragActive}
      className={`rounded-2xl ${isDragActive ? '' : ''}`}
    >
      <div
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:border-transparent ${
          isDragActive
            ? 'border-brand-yellow bg-brand-yellow/10 scale-[1.01]'
            : 'border-border-dark hover:border-brand-yellow/50 bg-white/[0.03] hover:bg-white/[0.05]'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={onButtonClick}
        tabIndex={0}
        role="button"
        aria-label="Upload files"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onButtonClick();
          }
        }}
      >
        <Scanline active={isDragActive} />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          className="hidden"
          multiple={multiple}
          accept={accept}
        />
        <UploadCloud className={`w-12 h-12 mb-4 transition-all duration-300 ${isDragActive ? 'text-brand-yellow scale-110' : 'text-text-low'}`} />
        <p className="text-text-mid text-center mb-2">
          <span className="font-semibold text-brand-yellow">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-text-low font-mono tracking-wide">PNG, JPG, GIF — 10 MB MAX</p>
      </div>
    </Reticle>
  );
};
