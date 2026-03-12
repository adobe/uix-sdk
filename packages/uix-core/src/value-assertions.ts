/** @internal */
export type Primitive = string | number | boolean;

export const isPlainObject = <T>(value: unknown): value is T & object => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const proto = Reflect.getPrototypeOf(value);

  return proto === null || proto === Object.prototype;
};

export const isPrimitive = (value: unknown): value is Primitive => {
  if (!value) {
    return true;
  }

  const theType = typeof value;

  return theType === "string" || theType === "number" || theType === "boolean";
};

export const isIterable = <T>(value: unknown): value is T[] =>
  Array.isArray(value);

export const isFunction = (value: unknown): value is CallableFunction =>
  typeof value === "function";

export const hasProp = (value: unknown, prop: string) =>
  !isPrimitive(value) && Reflect.has(value as object, prop);

export const isTunnelSource = (
  value: unknown,
): value is Window | ServiceWorker =>
  value instanceof Window ||
  value instanceof ServiceWorker ||
  hasProp(value, "onmessage");

export const isIframe = (value: unknown): value is HTMLIFrameElement => {
  if (!value || isPrimitive(value)) {
    return false;
  }

  const { nodeName } = value as HTMLIFrameElement;

  return typeof nodeName === "string" && nodeName.toLowerCase() === "iframe";
};

export const isObjectWithPrototype = <T>(
  value: unknown,
): value is T & { [key: string | symbol]: unknown } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const proto = Reflect.getPrototypeOf(value);

  return proto !== Object.prototype;
};
