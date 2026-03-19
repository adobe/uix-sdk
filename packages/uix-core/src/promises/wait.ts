/**
 * Promise that resolves after a specific time
 *
 * @internal
 */
export const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
