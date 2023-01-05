import type { WrappedMessage } from "./message-wrapper";
import type { DefTicket } from "./tickets";
import {
  Primitive,
  isPlainObject,
  isPrimitive,
  isIterable,
  isObjectWithPrototype,
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
export const CIRCULAR = "[[Circular]]";

export function transformRecursive<To>(
  transform: (source: unknown, parent?: Object) => To | typeof NOT_TRANSFORMED,
  value: unknown,
  parent?: Object,
  _refs: WeakSet<object> = new WeakSet()
): To {
  if (isPrimitive(value)) {
    return value as To;
  }
  const transformed = transform(value, parent);
  if (transformed !== NOT_TRANSFORMED) {
    return transformed;
  }
  if (isIterable(value)) {
    const outArray = [];
    for (const item of value) {
      outArray.push(transformRecursive(transform, item, undefined, _refs));
    }
    return outArray as To;
  }
  if (isPlainObject(value)) {
    if (_refs.has(value)) {
      return CIRCULAR as To;
    }
    _refs.add(value);
    const outObj = {};
    for (const key of Reflect.ownKeys(value)) {
      Reflect.set(
        outObj,
        key,
        transformRecursive(transform, Reflect.get(value, key), undefined, _refs)
      );
    }
    return outObj as To;
  }
  if (isObjectWithPrototype(value)) {
    if (_refs.has(value)) {
      return CIRCULAR as To;
    }
    _refs.add(value);
    const getObjectKeys = (obj: Object): (string | symbol)[] => {
      const result: Set<string | symbol> = new Set();
      do {
        if (Reflect.getPrototypeOf(obj) !== null) {
          for (const prop of Object.getOwnPropertyNames(obj)) {
            if (prop === "constructor") {
              continue;
            }
            result.add(prop);
          }
        }
      } while ((obj = Reflect.getPrototypeOf(obj)));

      return [...result];
    };
    const outObj = {};
    const properties = getObjectKeys(value);
    for (const key of properties) {
      Reflect.set(
        outObj,
        key,
        transformRecursive(transform, Reflect.get(value, key), value, _refs)
      );
    }
    return outObj as To;
  }

  throw new Error(`Bad value! ${Object.prototype.toString.call(value)}`);
}
