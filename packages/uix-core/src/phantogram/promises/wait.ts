/**
 * Promise that resolves after a specific time
 *
 * @export
 * @param {number} ms
 * @return {Promise}
 */
export function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
