import { describe, expect, it } from 'vitest';
import { TaskSkippedError, createQueue } from '@/lib/queue';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('createQueue', () => {
  it('nunca supera el límite de concurrencia', async () => {
    const add = createQueue(2);
    let active = 0;
    let max = 0;
    const task = () => async () => {
      active++;
      max = Math.max(max, active);
      await sleep(10);
      active--;
    };
    await Promise.all(Array.from({ length: 6 }, () => add(task())));
    expect(max).toBe(2);
  });

  it('devuelve el valor de cada tarea', async () => {
    const add = createQueue(1);
    const values = await Promise.all([add(async () => 1), add(async () => 2)]);
    expect(values).toEqual([1, 2]);
  });

  it('sigue con las demás tareas si una falla', async () => {
    const add = createQueue(1);
    const results = await Promise.allSettled([
      add(async () => {
        throw new Error('boom');
      }),
      add(async () => 'ok'),
    ]);
    expect(results[0].status).toBe('rejected');
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'ok' });
  });

  it('trata una excepción síncrona como rechazo', async () => {
    const add = createQueue(1);
    const p = add(() => {
      throw new Error('sync');
    });
    await expect(p).rejects.toThrow('sync');
    await expect(add(async () => 'next')).resolves.toBe('next');
  });

  it('omite las tareas obsoletas antes de empezarlas y libera el hueco', async () => {
    const add = createQueue(1);
    const ran: string[] = [];
    let stale = false;
    const first = add(async () => {
      await sleep(10);
      ran.push('a');
    });
    const skipped = add(
      async () => {
        ran.push('b');
      },
      () => !stale,
    );
    const third = add(async () => {
      ran.push('c');
    });
    stale = true;
    await expect(skipped).rejects.toBeInstanceOf(TaskSkippedError);
    await Promise.all([first, third]);
    expect(ran).toEqual(['a', 'c']);
  });
});
