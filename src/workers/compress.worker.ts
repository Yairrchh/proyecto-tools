import { compressBuffer } from '@/lib/codecs';
import type { WorkerRequest, WorkerResponse } from '@/lib/worker-protocol';

const post = (message: WorkerResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(message, transfer);

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { id, buffer, format, level, mime } = event.data;
  try {
    const out = await compressBuffer(buffer, format, level, mime);
    post({ id, ok: true, buffer: out }, [out]);
  } catch (err) {
    post({ id, ok: false, error: err instanceof Error ? err.message : 'Error desconocido' });
  }
});
