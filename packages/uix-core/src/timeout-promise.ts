/**
 * Add a timeout to a Promise. The returned Promise will resolve to the value of
 * the original Promise, but if it doesn't resolve within the timeout interval,
 * it will reject with a timeout error.
 * @internal
 *
 * @param timeoutMs - Time to wait (ms) before rejecting
 * @param promise - Original promise to set a timeout for
 * @returns - Promise that rejects after X milliseconds have passed
 */
export function timeoutPromise<T>(timeoutMs: number, promise: Promise<T>) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch(reject);
  });
}
