import type { Connection } from "penpal";

export type ApiMethod<T = unknown> = (...args: unknown[]) => Promise<T>;

export type GuestApi = {
  [methodName: string]: ApiMethod;
};

export interface NamespacedApis {
  [k: string]: NamespacedApis | GuestApi;
}

export type RequiredMethodsByName<Apis extends NamespacedApis> = {
  [Name in keyof Apis]: (keyof Apis[Name])[];
};

export interface Extension {
  id: string;
  url: string;
}

export interface HostMethodAddress {
  path: string[];
  name: string;
  args: unknown[];
}

export type RemoteMethodInvoker<T> = (address: HostMethodAddress) => Promise<T>;

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

export type NamedEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = CustomEvent<Detail> & {
  readonly type: Type;
};

type EventDetail = Record<string, unknown>;

export interface Emits<Events extends NamedEvent = NamedEvent>
  extends EventTarget {
  id: string;
  addEventListener<Type extends Events["type"]>(
    type: Type,
    listener: (ev: Extract<Events, { type: Type }>) => unknown
  ): () => void;
}

type HostEvent<Type extends string = string, Detail = EventDetail> = NamedEvent<
  Type,
  Detail & EventDetail & { host: UIXHost }
>;
type HostGuestEvent<Type extends string> = HostEvent<
  `guest${Type}`,
  { guest: UIXPort }
>;

export type HostEvents =
  | HostGuestEvent<"beforeload">
  | HostGuestEvent<"load">
  | HostEvent<"loadallguests">
  | HostEvent<"beforeunload">
  | HostEvent<"unload">
  | HostEvent<"error", { error: Error }>;

export type PortMap = Map<string, UIXPort>;

export interface UIXHost extends Emits<HostEvents> {
  rootName: string;
  loading: boolean;
  guests: PortMap;
}

type PortEvent<Type extends string = string, Detail = EventDetail> = NamedEvent<
  Type,
  Detail &
    EventDetail & {
      guestPort: UIXPort;
    }
>;

export type PortEvents =
  | PortEvent<"hostprovide">
  | PortEvent<"unload">
  | PortEvent<"beforecallhostmethod", HostMethodAddress>;

export interface UIXPort extends Emits<PortEvents> {
  load(): Promise<NamespacedApis>;
  isLoading(): boolean;
  unload(): Promise<void>;
  id: string;
  hasCapabilities<Apis extends NamespacedApis>(
    requiredMethods: RequiredMethodsByName<Apis>
  ): boolean;
  provide(apis: NamespacedApis): void;
}

type GuestEvent<
  Type extends string = string,
  Detail = EventDetail
> = NamedEvent<
  Type,
  Detail &
    EventDetail & {
      guest: UIXGuest;
    }
>;

export type GuestEvents =
  | GuestEvent<"beforeconnect">
  | GuestEvent<"connecting", { connection: Connection }>
  | GuestEvent<"connected", { connection: Connection }>
  | GuestEvent<"error", { error: Error }>;

export interface UIXGuest extends Emits<GuestEvents> {
  id: string;
  host: NamespacedApis;
  register(apis: NamespacedApis): Promise<void>;
}
