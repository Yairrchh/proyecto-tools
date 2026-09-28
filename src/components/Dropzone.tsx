'use client';

import { useState } from 'react';

export function Dropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);

  // Un <label> nativo que envuelve el input: accesible por teclado y lector de pantalla
  // sin ARIA extra, y su nombre accesible es el texto visible.
  return (
    <label
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
      className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600 ${
        dragging
          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
          : 'border-neutral-300 hover:border-blue-500 dark:border-neutral-700'
      }`}
    >
      <input
        data-testid="file-input"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          onFiles(files);
        }}
      />
      <span className="text-lg font-medium">Arrastra tus imágenes aquí</span>
      <span className="text-sm text-neutral-600 dark:text-neutral-400">o toca para seleccionarlas</span>
      <span className="text-xs text-neutral-600 dark:text-neutral-400">JPG · PNG · WebP — hasta 25 MB cada una</span>
    </label>
  );
}
