export class TaskSkippedError extends Error {
  constructor() {
    super('Tarea omitida: ya no es necesaria');
    this.name = 'TaskSkippedError';
  }
}

export function createQueue(concurrency: number) {
  let active = 0;
  const pending: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency) return;
    const run = pending.shift();
    if (!run) return;
    active++;
    run();
  };

  // `shouldRun` se consulta justo antes de empezar: si ya no hace falta la tarea
  // (p. ej. cambió la calidad o se quitó la imagen), se omite y libera el hueco al instante.
  return function add<T>(task: () => Promise<T>, shouldRun?: () => boolean): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      pending.push(() => {
        Promise.resolve()
          .then(() => {
            if (shouldRun && !shouldRun()) throw new TaskSkippedError();
            return task();
          })
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}
