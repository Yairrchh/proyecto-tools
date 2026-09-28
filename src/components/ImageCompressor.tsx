'use client';

import { useMemo } from 'react';
import { useCompressor } from '@/hooks/use-compressor';
import { formatBytes } from '@/lib/format';
import { summarize } from '@/lib/jobs';
import { outputName } from '@/lib/names';
import { DownloadAllButton } from './DownloadAllButton';
import { Dropzone } from './Dropzone';
import { QualitySelector } from './QualitySelector';
import { ResultRow } from './ResultRow';

export function ImageCompressor() {
  const { jobs, level, rejected, addFiles, changeLevel, removeJob, clear, dismissRejected } = useCompressor();

  const names = useMemo(() => {
    const taken = new Set<string>();
    return new Map(jobs.map((j) => [j.id, outputName(j.file.name, j.format, taken)]));
  }, [jobs]);

  const summary = summarize(jobs);

  return (
    <section className="flex flex-col gap-5">
      <QualitySelector value={level} onChange={changeLevel} />
      <Dropzone onFiles={addFiles} />

      {rejected.length > 0 && (
        <div
          data-testid="rejected-list"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          <ul className="list-inside list-disc">
            {rejected.map((r, i) => (
              <li key={`${r.name}-${i}`}>{r.reason}</li>
            ))}
          </ul>
          <button type="button" onClick={dismissRejected} className="mt-2 text-xs underline">
            Cerrar
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {jobs.map((job) => (
              <ResultRow key={job.id} job={job} outputName={names.get(job.id)!} onRemove={() => removeJob(job.id)} />
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {summary.doneCount > 0 &&
                `Total: ${formatBytes(summary.originalTotal)} → ${formatBytes(summary.compressedTotal)} (−${summary.percent}%)`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clear}
                className="rounded-xl border border-neutral-300 px-4 py-3 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Limpiar
              </button>
              <DownloadAllButton jobs={jobs} names={names} />
            </div>
          </div>
        </>
      )}

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        🔒 Tus imágenes no salen de tu dispositivo.
      </p>
    </section>
  );
}
