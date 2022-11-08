/**
 * Add a timeout to a Promise. The returned Promise will resolve to the value of
 * the original Promise, but if it doesn't resolve within the timeout interval,
 * it will reject with a timeout error.
 *
 * @param description - Job description to be used in the timeout error
 * @param promise - Original promise to set a timeout for
 * @param timeoutMs - Time to wait (ms) before rejecting
 * @param cleanup - Run when promise times out to clean up handles
 * @returns - Promise that rejects with informative error after X milliseconds have passed
 */
export function timeoutPromise<T>(
  description: string,
  promise: Promise<T>,
  ms: number,
  cleanup: () => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`${description} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((e) => {
        clearTimeout(timeout);
        cleanup();
        reject(e);
      });
  });
}
