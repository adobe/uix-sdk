/** @internal */
export type Primitive = string | number | boolean;

export function isPlainObject<T>(value: unknown): value is T & object {
  if (!value || typeof value !== "object") {
    return false;
  }
  const proto = Reflect.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

export function isPrimitive(value: unknown): value is Primitive {
  if (!value) {
    return true;
  }
  const theType = typeof value;
  return theType === "string" || theType === "number" || theType === "boolean";
}

export function isIterable<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isFunction(value: unknown): value is CallableFunction {
  return typeof value === "function";
}

export function hasProp(value: unknown, prop: string) {
  return !isPrimitive(value) && Reflect.has(value as object, prop);
}

export function isTunnelSource(
  value: unknown
): value is Window | ServiceWorker {
  return (
    value instanceof Window ||
    value instanceof ServiceWorker ||
    hasProp(value, "onmessage")
  );
}

export function isIframe(value: unknown): value is HTMLIFrameElement {
  if (!value || isPrimitive(value)) {
    return false;
  }
  const { nodeName } = value as HTMLIFrameElement;
  return typeof nodeName === "string" && nodeName.toLowerCase() === "iframe";
}

export function isObjectWithPrototype<T>(
  value: unknown
): value is T & { [key: string | symbol]: unknown } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const proto = Reflect.getPrototypeOf(value);
  return proto !== Object.prototype;
}
