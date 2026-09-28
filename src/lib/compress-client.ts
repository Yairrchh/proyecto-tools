import { createQueue } from './queue';
import { MIME_BY_FORMAT, type ImageFormat, type QualityLevel } from './types';
import type { WorkerRequest, WorkerResponse } from './worker-protocol';

export interface Compressor {
  compress(file: File, format: ImageFormat, level: QualityLevel): Promise<Blob>;
  dispose(): void;
}

let nextId = 1;

function callWorker(worker: Worker, request: Omit<WorkerRequest, 'id'>): Promise<ArrayBuffer> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.ok) resolve(event.data.buffer);
      else reject(new Error(event.data.error));
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || 'Error en el procesador de imágenes'));
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ id, ...request } satisfies WorkerRequest, [request.buffer]);
  });
}

export function createCompressor(concurrency: number): Compressor {
  const enqueue = createQueue(concurrency);
  const idle: Worker[] = [];

  return {
    compress(file, format, level) {
      return enqueue(async () => {
        const worker =
          idle.pop() ??
          new Worker(new URL('../workers/compress.worker.ts', import.meta.url), { type: 'module' });
        try {
          const buffer = await file.arrayBuffer();
          const out = await callWorker(worker, { buffer, format, level, mime: file.type || MIME_BY_FORMAT[format] });
          idle.push(worker);
          return new Blob([out], { type: MIME_BY_FORMAT[format] });
        } catch (err) {
          worker.terminate();
          throw err;
        }
      });
    },
    dispose() {
      idle.splice(0).forEach((w) => w.terminate());
    },
  };
}
