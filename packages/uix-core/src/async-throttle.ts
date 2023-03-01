/**
 * Return a version of a callback that will only run once within an interval.
 * Waits for async operations in callback to complete before allowing the next
 * throttled event to call the callback again.
 *
 * @param callback - Callback function to be throttled
 * @param intervalMs - Interval in milliseconds
 */

export function asyncThrottle<T extends (...args: any) => any>(
  callback: T,
  intervalMs: number
) {
  let throttled = false;
  return (...args: Parameters<typeof callback>) => {
    if (throttled) {
      return;
    }
    throttled = true;
    setTimeout(async () => {
      await callback(...(args as unknown[]));
      throttled = false;
    }, intervalMs);
  };
}
