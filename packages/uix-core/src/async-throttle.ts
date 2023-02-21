/**
 * Return a version of a callback that will only run once within an interval.
 *
 * @param callback - Callback function to be throttled
 * @param intervalMs - Interval in milliseconds
 */

export function asyncThrottle(
  callback: (...args: unknown[]) => void,
  intervalMs: number
) {
  let throttled = false;
  return (...args: Parameters<typeof callback>) => {
    if (throttled) {
      return;
    }
    throttled = true;
    setTimeout(async () => {
      await callback(...args);
      throttled = false;
    }, intervalMs);
  };
}
