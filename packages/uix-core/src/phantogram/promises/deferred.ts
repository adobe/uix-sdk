/**
 * @typedef Deferred
 * @export
 * @prop {resolve}
 * @prop {reject}
 * @prop {Promise}
 */

/**
 * Create a Promise that can be resolved externally,
 * A Deferred is a tuple of { promise, resolve, reject }.
 * @export
 * @return {Deferred}
 */
export function defer<T>() {
  let innerResolve: (resolved: T) => void;
  let innerReject: (rejection: Error) => void;
  return {
    resolve(value: T) {
      innerResolve(value);
    },
    reject(value: Error) {
      innerReject(value);
    },
    promise: new Promise((realResolve, realReject) => {
      innerResolve = realResolve;
      innerReject = realReject;
    }),
  };
}
