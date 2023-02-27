/**
 * Add a timeout to a Promise. The returned Promise will resolve to the value of
 * the original Promise, but if it doesn't resolve within the timeout interval,
 * it will reject with a timeout error.
 *
 * @param describe - Job description to be used in the timeout error
 * @param promise - Original promise to set a timeout for
 * @param timeoutMs - Time to wait (ms) before rejecting
 * @param onReject - Run when promise times out to clean up handles
 * @returns - Promise that rejects with informative error after X milliseconds have passed
 *
 * @internal
 */
export function timeoutPromise<T>(
  describe: string | (() => string),
  promise: Promise<T>,
  ms: number,
  onReject?: (e: Error) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanupAndReject = async (e: Error) => {
      try {
        if (onReject) {
          await onReject(e);
        }
      } finally {
        reject(e);
      }
    };
    const timeout = setTimeout(() => {
      cleanupAndReject(
        new Error(
          `${
            typeof describe === "function" ? describe() : describe
          } timed out after ${ms}ms`
        )
      );
    }, ms);
    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((e) => {
        clearTimeout(timeout);
        cleanupAndReject(e);
      });
  });
}
