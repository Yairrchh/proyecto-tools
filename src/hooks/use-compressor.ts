'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createCompressor, type Compressor } from '@/lib/compress-client';
import { detectConcurrency } from '@/lib/device';
import { friendlyError } from '@/lib/errors';
import { jobsReducer, type Job } from '@/lib/jobs';
import { DEFAULT_QUALITY } from '@/lib/quality';
import { TaskSkippedError } from '@/lib/queue';
import { chooseResult } from '@/lib/savings';
import type { QualityLevel } from '@/lib/types';
import { acceptFiles } from '@/lib/validate';

export function useCompressor() {
  const [jobs, dispatch] = useReducer(jobsReducer, [] as Job[]);
  const [level, setLevel] = useState<QualityLevel>(DEFAULT_QUALITY);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);

  const levelRef = useRef<QualityLevel>(DEFAULT_QUALITY);
  const compressorRef = useRef<Compressor | null>(null);
  const startedRef = useRef(new Set<string>());
  const idCounterRef = useRef(0);
  const jobsRef = useRef<Job[]>([]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Lanza la compresión de cada trabajo en cola exactamente una vez por intento.
  useEffect(() => {
    for (const job of jobs) {
      if (job.status !== 'queued') continue;
      const key = `${job.id}:${job.attempt}`;
      if (startedRef.current.has(key)) continue;
      startedRef.current.add(key);

      compressorRef.current ??= createCompressor(detectConcurrency());
      dispatch({ type: 'start', id: job.id, attempt: job.attempt });
      compressorRef.current
        .compress(
          job.file,
          job.format,
          levelRef.current,
          // Si el trabajo se quitó o cambió de intento, no gastar la cola en él.
          () => jobsRef.current.some((j) => j.id === job.id && j.attempt === job.attempt),
        )
        .then((compressed) => {
          const { blob, keptOriginal } = chooseResult(job.file, compressed);
          dispatch({ type: 'done', id: job.id, attempt: job.attempt, blob, keptOriginal });
        })
        .catch((err) => {
          if (err instanceof TaskSkippedError) return;
          console.error(err);
          dispatch({
            type: 'fail',
            id: job.id,
            attempt: job.attempt,
            error: friendlyError(err instanceof Error ? err.message : ''),
          });
        });
    }
  }, [jobs]);

  useEffect(() => () => compressorRef.current?.dispose(), []);

  const jobsCount = jobs.length;

  const addFiles = useCallback(
    (files: File[]) => {
      const { accepted, rejected: notAccepted } = acceptFiles(files, jobsCount);
      setRejected(notAccepted);
      dispatch({
        type: 'add',
        jobs: accepted.map(({ file, format }) => ({
          id: `job-${idCounterRef.current++}`,
          file,
          format,
          status: 'queued' as const,
          attempt: 0,
          originalSize: file.size,
        })),
      });
    },
    [jobsCount],
  );

  const changeLevel = useCallback((next: QualityLevel) => {
    if (next === levelRef.current) return;
    levelRef.current = next;
    setLevel(next);
    dispatch({ type: 'requeue' });
  }, []);

  return {
    jobs,
    level,
    rejected,
    addFiles,
    changeLevel,
    retryJob: (id: string) => dispatch({ type: 'retry', id }),
    removeJob: (id: string) => dispatch({ type: 'remove', id }),
    clear: () => dispatch({ type: 'clear' }),
    dismissRejected: () => setRejected([]),
  };
}
