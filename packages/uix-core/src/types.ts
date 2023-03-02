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

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extract keys of T whose values are are assignable to U.
 * @internal
 */
type ExtractKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];

/**
 * @internal
 */
type GuestApiMethod = (...args: any[]) => any;

/**
 * @internal
 */
export interface GuestApiNS {
  [k: string]: GuestApiMethod;
}

/**
 * @internal
 */
export interface GuestApis {
  [k: string]: GuestApiNS;
}

/**
 * @internal
 */
export type RemoteGuestApiNS<G extends GuestApiNS = GuestApiNS> = {
  [K in ExtractKeys<G, GuestApiMethod>]: (
    ...args: Parameters<G[K]>
  ) => Promise<ReturnType<G[K]>>;
};

/**
 * @internal
 */
export type RemoteGuestApis<G extends GuestApis = GuestApis> = {
  [K in ExtractKeys<G, GuestApiNS>]: RemoteGuestApiNS<GuestApiNS>;
};

/**
 * @internal
 */
export type VirtualApi = Record<
  string,
  object | ((...args: unknown[]) => unknown)
>;

/**
 * @internal
 */
export type RemoteHostApis<Api = VirtualApi> = {
  [K in ExtractKeys<Api, CallableFunction | object>]: Api[K] extends (
    ...args: unknown[]
  ) => PromiseLike<any>
    ? Api[K]
    : Api[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : RemoteHostApis<Api[K]>;
};
/**

/**
 * An individual UI extension retrieved from the registry.
 *
 * @remarks This interface is likely to expand. As the metadata from the
 * extension registry stabilizes, it should probably be passed through.
 * Right now, there are too many cases where an extension string ID
 * is directly used; this should probably be an opaque, structured object.
 *
 * @public
 */
export interface Extension {
  /**
   * Unique ID of the extension. Must be unique across entire app
   */
  id: string;
  /**
   * Location of the document to load for the {@link @adobe/uix-guest#GuestServer}
   */
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
 * @internal
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
 * A callback to pass to a new namespace proxy. It will call that
 * call back with a {@link HostMethodAddress} when one of its properties is
 * invoked as a method.
 *
 * Because the typical use case is for asynchronous cross-realm communication,
 * the callback is expected to return a Promise for the return value.
 * @internal
 */
export type RemoteMethodInvoker<T> = (address: HostMethodAddress) => Promise<T>;

/**
 * Interface for decoupling Port from GuestServer.host
 * @internal
 */
export interface HostConnection<T = unknown> {
  /**
   * see {@link @adobe/uix-host#Port}
   */
  getSharedContext(): Record<string, unknown>;
  /**
   * see {@link @adobe/uix-host#Port}
   */
  invokeHostMethod: RemoteMethodInvoker<T>;
}

/**
 * @internal
 */
export interface UIFrameRect {
  height: number;
  width: number;
}

/**
 * Guest UIs
 * @internal
 */
export interface UIHostMethods {
  onIframeResize(dimensions: UIFrameRect): void;
}

/**
 * @internal
 */
export type UIHostConnection<T = unknown> = HostConnection<T> & UIHostMethods;

/** @public */
export type GuestConnectionEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = NamedEvent<
  Type,
  Detail &
    Record<string, unknown> & {
      guestPort: GuestConnection;
    }
>;

/** @public */
export type GuestConnectionEvents<
  HostApi extends Record<string, unknown> = Record<string, unknown>
> =
  | GuestConnectionEvent<"hostprovide">
  | GuestConnectionEvent<"unload">
  | GuestConnectionEvent<"beforecallhostmethod", HostMethodAddress<HostApi>>
  | GuestConnectionEvent<
      "guestresize",
      { dimensions: UIFrameRect; iframe: HTMLIFrameElement }
    >;

/**
 * {@inheritDoc @adobe/uix-host#Port}
 * @internal
 */
export interface GuestConnection {
  id: string;
  url: URL;
  attachUI(
    frame: HTMLIFrameElement,
    privateMethods?: RemoteHostApis
  ): Promise<unknown>;
  load(): Promise<unknown>;
  error?: Error;
  hasCapabilities(capabilities: unknown): boolean;
  isReady(): boolean;
  provide(apis: unknown): void;
  unload(): Promise<unknown>;
}

/**
 * @internal
 */
export type GuestEmitter = GuestConnection & Emits<GuestConnectionEvents>;

/**
 * BEGIN EVENTS
 */

/**
 * Returned from {@link Emitter.addEventListener}. Unsubscribes the original
 * handler when called.
 * @internal
 */
export type Unsubscriber = () => void;

/**
 * Strongly typed event with a string `type` parameter.
 * @internal
 */
export type NamedEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = CustomEvent<Detail> & {
  readonly type: Type;
};

/**
 * Typed EventTarget
 * @internal
 */
export interface Emits<Events extends NamedEvent = NamedEvent>
  extends EventTarget {
  id: string;
  /**
   * Same as EventTarget.addEventListener but returns an unsubscribe callback.
   */
  addEventListener<Type extends Events["type"]>(
    type: Type,
    listener: (ev: Extract<Events, { type: Type }>) => unknown
  ): () => void;
  /**
   * Same as EventTarget.removeEventListener but typed.
   */
  removeEventListener<Type extends Events["type"]>(
    type: Type,
    listener: (ev: Extract<Events, { type: Type }>) => unknown
  ): void;
}
