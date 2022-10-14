/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AsyncMethodReturns } from "penpal";

export type VirtualApi = Record<
  string,
  object | ((...args: unknown[]) => unknown)
>;

/**
 * Extract keys of T whose values are are assignable to U.
 */
type ExtractKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];
/**
 * A mapped type to recursively convert non async methods into async methods and exclude
 * any non function properties from T.
 */
export type LocalApis<Api = VirtualApi> = {
  [K in ExtractKeys<
    Api,
    (...args: unknown[]) => unknown | object
  >]: Api[K] extends (...args: unknown[]) => PromiseLike<any>
    ? Api[K]
    : Api[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : LocalApis<Api[K]>;
};
/**

/**
 * A recursive object of simple methods, all of which are async in the new type.
 */
export type RemoteApis<Api = VirtualApi> = AsyncMethodReturns<Api>;

/**
 * A local API paired with a remote API, describing a contract with a remote.
 */
export type ApiContract<Incoming, Outgoing> = {
  incoming: RemoteApis<Incoming>;
  outgoing: LocalApis<Outgoing>;
};

/**
 * A specifier for methods to be expected on a remote interface. Used in
 * `Port.hasCapabilities` and `useExtensions.requires`
 */
export type RequiredMethodsByName<T> = {
  [Name in keyof RemoteApis<T>]: (keyof RemoteApis<T>[Name])[];
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
export interface HostMethodAddress<Args = unknown[]> {
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
  args: Args;
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
  getSharedContext(): Record<string, unknown>;
  invokeHostMethod: RemoteMethodInvoker<T>;
}

export interface GuestConnection {
  id: string;
  url: URL;
  attachUI(frame: HTMLIFrameElement): {
    promise: Promise<unknown>;
    // eslint-disable-next-line @typescript-eslint/ban-types
    destroy: Function;
  };
  load(): Promise<unknown>;
  error?: Error;
  hasCapabilities(capabilities: unknown): boolean;
  isReady(): boolean;
  provide(apis: unknown): void;
  unload(): Promise<unknown>;
}

export interface GuestMethods {
  apis: RemoteApis;
  emit(type: string, detail: unknown): Promise<void>;
}

export interface UIGuestPositioning {
  attached: boolean;
  parent: DOMRect;
  ui: DOMRect;
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
