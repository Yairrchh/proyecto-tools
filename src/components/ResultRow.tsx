'use client';

import { useEffect, useState } from 'react';
import { downloadBlob } from '@/lib/download';
import { formatBytes } from '@/lib/format';
import type { Job } from '@/lib/jobs';
import { savingsPercent } from '@/lib/savings';

export function ResultRow({
  job,
  outputName,
  onRetry,
  onRemove,
}: {
  job: Job;
  outputName: string;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const [thumb, setThumb] = useState<string>();

  // Miniatura pequeña: evita decodificar una foto de varios MB solo para mostrar 56 px.
  useEffect(() => {
    let cancelled = false;
    createImageBitmap(job.file, { resizeWidth: 112, resizeQuality: 'medium' })
      .then((bitmap) => {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
        bitmap.close();
        if (!cancelled) setThumb(canvas.toDataURL('image/jpeg', 0.7));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [job.file]);

  const working = job.status === 'queued' || job.status === 'processing';

  return (
    <li
      data-testid="result-row"
      data-status={job.status}
      data-original-size={job.originalSize}
      data-compressed-size={job.compressedSize}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {thumb ? <img src={thumb} alt="" className="size-14 shrink-0 rounded-lg object-cover" /> : <div className="size-14 shrink-0" />}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{job.file.name}</p>
        {working && (
          <>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Comprimiendo…</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" />
            </div>
          </>
        )}
        {job.status === 'error' && <p className="text-xs text-red-600 dark:text-red-400">{job.error}</p>}
        {job.status === 'done' && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {formatBytes(job.originalSize)} → {formatBytes(job.compressedSize ?? 0)}{' '}
            {job.keptOriginal ? (
              <span className="font-medium">· Ya estaba optimizada</span>
            ) : (
              <span className="font-medium text-green-700 dark:text-green-400">
                −{savingsPercent(job.originalSize, job.compressedSize ?? 0)}%
              </span>
            )}
          </p>
        )}
      </div>

      {job.status === 'done' && job.blob && (
        <button
          type="button"
          onClick={() => downloadBlob(job.blob!, outputName)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Descargar
        </button>
      )}
      {job.status === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Reintentar
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${job.file.name}`}
        className="rounded-lg px-2 py-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        ✕
      </button>
    </li>
  );
}
