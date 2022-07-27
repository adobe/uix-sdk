/**
 * A generic function that returns a Promise for its type argument.
 */
export type ApiMethod<T = unknown> = (...args: unknown[]) => Promise<T>;

/**
 * A generic dictionary of {@link ApiMethod} object.
 */
export type GuestApi = {
  [methodName: string]: ApiMethod;
};

/**
 * An arbitrary-depth dictionary of {@link GuestApi} objects.
 */
export interface NamespacedApis {
  [k: string]: NamespacedApis | GuestApi;
}

/**
 * A specifier for methods to be expected on a remote interface. Used in
 * `Port.hasCapabilities` and `useExtensions.requires`
 */
export type RequiredMethodsByName<Apis extends NamespacedApis> = {
  [Name in keyof Apis]: (keyof Apis[Name])[];
};

/**
 * Simple tuple of a unique ID and a URL where the extension is deployed.
 */
export interface Extension {
  id: string;
  url: string;
}

/**
 * Describes a method invocation to/from a remote realm, such as an iframe.
 *
 * @example Calling a host API method
 *
 * #### `extension.ts`
 * ```ts
 * // The following line causes the Guest object to build a `HostMethodAddress`
 * // and dispatch it to the parent app
 * uix.host.accounts.lookup.byQuery('Kevin', { pick: 'homeAddress' });
 * ```
 *
 * The above call produces this `HostMethodAddress` and sends it to the invoker:
 * ```json
 * {
 *  path: ["accounts","lookup"],
 *  name: "byQuery",
 *  args: ["Kevin", { "pick": "homeAddress" }]
 * }
 * ```
 *
 */
export interface HostMethodAddress {
  /**
   * Consecutive dot lookups on nested objects before the actual function call.
   */
  path: string[];
  /**
   * Name of the method to be called as a function.
   */
  name: string;
  /**
   * Any (serializable) arguments to the remote function.
   */
  args: unknown[];
}

/**
 * A callback to pass to a new {@link !./namespace-proxy}. It will call that
 * call back with a {@link HostMethodAddress} when one of its properties is
 * invoked as a method.
 *
 * Because the typical use case is for asynchronous cross-realm communication,
 * the callback is expected to return a Promise for the return value.
 */
export type RemoteMethodInvoker<T> = (address: HostMethodAddress) => Promise<T>;

/**
 * @hidden
 */
export interface HostConnection<T = unknown> {
  invokeHostMethod: RemoteMethodInvoker<T>;
}

/**
 * BEGIN EVENTS
 */

/**
 * Returned from {@link Emitter.addEventListener}. Unsubscribes the original
 * handler when called.
 */
export type Unsubscriber = () => void;

/**
 * Strongly typed event with a string `type` parameter.
 */
export type NamedEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = CustomEvent<Detail> & {
  readonly type: Type;
};

export interface Emits<Events extends NamedEvent = NamedEvent>
  extends EventTarget {
  id: string;
  addEventListener<Type extends Events["type"]>(
    type: Type,
    listener: (ev: Extract<Events, { type: Type }>) => unknown
  ): () => void;
}
