import type { ImageFormat, QualityLevel } from './types';

export interface WorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  format: ImageFormat;
  level: QualityLevel;
  mime: string;
}

export type WorkerResponse =
  | { id: number; ok: true; buffer: ArrayBuffer }
  | { id: number; ok: false; error: string };
