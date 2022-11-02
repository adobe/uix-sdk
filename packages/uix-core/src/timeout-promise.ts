/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

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
