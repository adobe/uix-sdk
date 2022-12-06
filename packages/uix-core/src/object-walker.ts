import type { WrappedMessage } from "./message-wrapper";
import type { DefTicket } from "./tickets";
import {
  Primitive,
  isPlainObject,
  isPrimitive,
  isIterable,
} from "./value-assertions";

/**
 * Extract keys of T whose values are assignable to U.
 * @internal
 */
type ExtractKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];

/**
 * Convert all functions anywhere in T to async functions.
 * @internal
 */
export type Asynced<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => Promise<R>
  : {
      [K in ExtractKeys<
        T,
        Function | object | any[] | [any, any]
      >]: T[K] extends (...args: any) => PromiseLike<any>
        ? T[K]
        : T[K] extends [infer U, infer V]
        ? [Asynced<U>, Asynced<V>]
        : T[K] extends (infer U)[]
        ? Asynced<U>[]
        : T[K] extends (...args: infer A) => infer R
        ? (...args: A) => Promise<R>
        : Asynced<T[K]>;
    };

/** @internal */
export type Materialized<T> = T extends Primitive
  ? T
  : // : T extends (...args: infer A) => infer R
  // ? (...args: A) => Promise<R>
  T extends Simulated<infer U>
  ? Asynced<U>
  : Asynced<T>;

/** @internal */
export type DefMessage = WrappedMessage<DefTicket>;

/** @internal */
export type Simulated<T> = {
  [K in ExtractKeys<T, Function | object>]: T[K] extends (
    ...args: unknown[]
  ) => unknown
    ? DefMessage
    : Simulated<T[K]>;
};

export const NOT_TRANSFORMED = Symbol.for("NOT_TRANSFORMED");

export function transformRecursive<To>(
  transform: (source: unknown) => To | typeof NOT_TRANSFORMED,
  value: unknown
): To {
  if (isPrimitive(value)) {
    return value as To;
  }
  const transformed = transform(value);
  if (transformed !== NOT_TRANSFORMED) {
    return transformed;
  }
  if (isIterable(value)) {
    const outArray = [];
    for (const item of value) {
      outArray.push(transformRecursive(transform, item));
    }
    return outArray as To;
  }
  if (isPlainObject(value)) {
    const outObj = {};
    for (const key of Reflect.ownKeys(value)) {
      Reflect.set(
        outObj,
        key,
        transformRecursive(transform, Reflect.get(value, key))
      );
    }
    return outObj as To;
  }
  throw new Error(`Bad value! ${Object.prototype.toString.call(value)}`);
}
