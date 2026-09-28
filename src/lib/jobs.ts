import { savingsPercent } from './savings';
import type { ImageFormat } from './types';

export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface Job {
  id: string;
  file: File;
  format: ImageFormat;
  status: JobStatus;
  attempt: number;
  originalSize: number;
  compressedSize?: number;
  blob?: Blob;
  keptOriginal?: boolean;
  error?: string;
}

export type JobAction =
  | { type: 'add'; jobs: Job[] }
  | { type: 'start'; id: string; attempt: number }
  | { type: 'done'; id: string; attempt: number; blob: Blob; keptOriginal: boolean }
  | { type: 'fail'; id: string; attempt: number; error: string }
  | { type: 'requeue' }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

function update(state: Job[], id: string, attempt: number, fn: (job: Job) => Job): Job[] {
  return state.map((job) => (job.id === id && job.attempt === attempt ? fn(job) : job));
}

export function jobsReducer(state: Job[], action: JobAction): Job[] {
  switch (action.type) {
    case 'add':
      return [...state, ...action.jobs];
    case 'start':
      return update(state, action.id, action.attempt, (j) => ({ ...j, status: 'processing' }));
    case 'done':
      return update(state, action.id, action.attempt, (j) => ({
        ...j,
        status: 'done',
        blob: action.blob,
        compressedSize: action.blob.size,
        keptOriginal: action.keptOriginal,
        error: undefined,
      }));
    case 'fail':
      return update(state, action.id, action.attempt, (j) => ({
        ...j,
        status: 'error',
        error: action.error,
      }));
    case 'requeue':
      return state.map((j) => ({
        ...j,
        status: 'queued',
        attempt: j.attempt + 1,
        blob: undefined,
        compressedSize: undefined,
        keptOriginal: undefined,
        error: undefined,
      }));
    case 'remove':
      return state.filter((j) => j.id !== action.id);
    case 'clear':
      return [];
  }
}

export function summarize(jobs: Job[]) {
  const done = jobs.filter((j) => j.status === 'done' && j.blob);
  const originalTotal = done.reduce((sum, j) => sum + j.originalSize, 0);
  const compressedTotal = done.reduce((sum, j) => sum + (j.compressedSize ?? 0), 0);
  return {
    doneCount: done.length,
    pendingCount: jobs.filter((j) => j.status === 'queued' || j.status === 'processing').length,
    originalTotal,
    compressedTotal,
    percent: savingsPercent(originalTotal, compressedTotal),
  };
}
