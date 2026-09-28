'use client';

import { useRef, useState } from 'react';

export function Dropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Seleccionar imágenes para comprimir"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        dragging
          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
          : 'border-neutral-300 hover:border-blue-500 dark:border-neutral-700'
      }`}
    >
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        className="sr-only"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          onFiles(files);
        }}
      />
      <p className="text-lg font-medium">Arrastra tus imágenes aquí</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">o toca para seleccionarlas</p>
      <p className="text-xs text-neutral-500">JPG · PNG · WebP — hasta 25 MB cada una</p>
    </div>
  );
}
