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

  return function add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      pending.push(() => {
        Promise.resolve()
          .then(task)
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
