import type { WrappedMessage } from "./message-wrapper";
import type { DefTicket } from "./tickets";
import {
  Primitive,
  isPlainObject,
  isPrimitive,
  isIterable,
  isFunction,
  hasProp,
} from "./value-assertions";
import { unwrap, isWrapped } from "./message-wrapper";

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

function isDefMessage(value: unknown): value is DefMessage {
  return isWrapped(value) && hasProp(unwrap(value), "fnId");
}

export function simulateFuncsRecursive<T>(
  onFunction: (fn: CallableFunction) => DefMessage,
  value: unknown
): Simulated<T> {
  if (isPrimitive(value)) {
    return value as Simulated<T>;
  }
  if (isFunction(value)) {
    return onFunction(value) as Simulated<T>;
  }
  if (isIterable(value)) {
    const outArray = [];
    for (const item of value) {
      outArray.push(simulateFuncsRecursive(onFunction, item));
    }
    return outArray as Simulated<T>;
  }
  if (isPlainObject(value)) {
    const outObj = {};
    for (const key of Reflect.ownKeys(value)) {
      Reflect.set(
        outObj,
        key,
        simulateFuncsRecursive(onFunction, Reflect.get(value, key))
      );
    }
    return outObj as Simulated<T>;
  }
  throw new Error(`Bad value! ${Object.prototype.toString.call(value)}`);
}

export function materializeFuncsRecursive<T>(
  onDefMessage: (msg: DefMessage) => CallableFunction,
  value: unknown
): Materialized<T> {
  if (isPrimitive(value) || isFunction(value)) {
    return value as Materialized<T>;
  }
  if (isDefMessage(value)) {
    return onDefMessage(value) as Materialized<T>;
  }
  if (isIterable(value)) {
    const outArray = [];
    for (const item of value) {
      outArray.push(materializeFuncsRecursive(onDefMessage, item));
    }
    return outArray as Materialized<T>;
  }
  if (isPlainObject(value)) {
    const outObj = {};
    for (const key of Reflect.ownKeys(value)) {
      Reflect.set(
        outObj,
        key,
        materializeFuncsRecursive(onDefMessage, Reflect.get(value, key))
      );
    }
    return outObj as Materialized<T>;
  }
  /* istanbul ignore next: should never happen */
  return value as Materialized<T>;
}
