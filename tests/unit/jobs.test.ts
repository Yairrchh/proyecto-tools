import { describe, expect, it } from 'vitest';
import { jobsReducer, summarize, type Job } from '@/lib/jobs';

const makeJob = (id: string, size = 1000): Job => ({
  id,
  file: { name: `${id}.jpg`, size, type: 'image/jpeg' } as unknown as File,
  format: 'jpeg',
  status: 'queued',
  attempt: 0,
  originalSize: size,
});

const blobOf = (n: number) => new Blob([new Uint8Array(n)]);

describe('jobsReducer', () => {
  it('añade trabajos', () => {
    const state = jobsReducer([], { type: 'add', jobs: [makeJob('a'), makeJob('b')] });
    expect(state.map((j) => j.id)).toEqual(['a', 'b']);
  });

  it('pasa por start → done y guarda el resultado', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a', 1000)] });
    state = jobsReducer(state, { type: 'start', id: 'a', attempt: 0 });
    expect(state[0].status).toBe('processing');
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 0, blob: blobOf(400), keptOriginal: false });
    expect(state[0].status).toBe('done');
    expect(state[0].compressedSize).toBe(400);
    expect(state[0].keptOriginal).toBe(false);
  });

  it('marca error sin afectar a los demás', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a'), makeJob('b')] });
    state = jobsReducer(state, { type: 'fail', id: 'a', attempt: 0, error: 'roto' });
    expect(state[0]).toMatchObject({ status: 'error', error: 'roto' });
    expect(state[1].status).toBe('queued');
  });

  it('requeue sube el intento, limpia resultados y vuelve a poner en cola', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a')] });
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 0, blob: blobOf(300), keptOriginal: false });
    state = jobsReducer(state, { type: 'requeue' });
    expect(state[0]).toMatchObject({ status: 'queued', attempt: 1 });
    expect(state[0].blob).toBeUndefined();
    expect(state[0].compressedSize).toBeUndefined();
  });

  it('ignora resultados de un intento anterior (cambio de calidad en curso)', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a')] });
    state = jobsReducer(state, { type: 'requeue' }); // ahora attempt = 1
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 0, blob: blobOf(300), keptOriginal: false });
    expect(state[0].status).toBe('queued');
    state = jobsReducer(state, { type: 'fail', id: 'a', attempt: 0, error: 'viejo' });
    expect(state[0].status).toBe('queued');
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 1, blob: blobOf(200), keptOriginal: false });
    expect(state[0]).toMatchObject({ status: 'done', compressedSize: 200 });
  });

  it('elimina y limpia', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a'), makeJob('b')] });
    state = jobsReducer(state, { type: 'remove', id: 'a' });
    expect(state.map((j) => j.id)).toEqual(['b']);
    expect(jobsReducer(state, { type: 'clear' })).toEqual([]);
  });
});

describe('summarize', () => {
  it('suma solo los trabajos terminados y cuenta los pendientes', () => {
    let state = jobsReducer([], { type: 'add', jobs: [makeJob('a', 1000), makeJob('b', 3000), makeJob('c', 500)] });
    state = jobsReducer(state, { type: 'done', id: 'a', attempt: 0, blob: blobOf(250), keptOriginal: false });
    state = jobsReducer(state, { type: 'done', id: 'b', attempt: 0, blob: blobOf(750), keptOriginal: false });
    state = jobsReducer(state, { type: 'start', id: 'c', attempt: 0 });
    expect(summarize(state)).toEqual({
      doneCount: 2,
      pendingCount: 1,
      originalTotal: 4000,
      compressedTotal: 1000,
      percent: 75,
    });
  });

  it('con lista vacía devuelve ceros', () => {
    expect(summarize([])).toEqual({ doneCount: 0, pendingCount: 0, originalTotal: 0, compressedTotal: 0, percent: 0 });
  });
});
