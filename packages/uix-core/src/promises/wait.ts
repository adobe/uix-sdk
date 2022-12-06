/**
 * Promise that resolves after a specific time
 *
 * @internal
 */
export function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
