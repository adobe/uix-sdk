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

export type NamedEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = CustomEvent<Detail> & {
  readonly type: Type;
};

type EventDetail = Record<string, unknown>;

export interface Emits<Events extends NamedEvent = NamedEvent> {
  addEventListener<
    Type extends Events["type"],
    Event extends Events & { type: Type }
  >(
    type: Type,
    listener: (ev: Event) => unknown
  ): () => void;
}

type HostEvent<Type extends string = string, Detail = EventDetail> = NamedEvent<
  Type,
  Detail & EventDetail & { host: UIXHost }
>;
type HostGuestEvent<Type extends string> = HostEvent<
  `guest${Type}`,
  { guest: UIXGuestConnector }
>;

export type HostEvents =
  | HostGuestEvent<"beforeload">
  | HostGuestEvent<"load">
  | HostEvent<"loadallguests">
  | HostEvent<"error", { error: Error }>;

export type GuestConnectorMap = Map<string, UIXGuestConnector>;

export interface UIXHost extends Emits<HostEvents> {
  rootName: string;
  loading: boolean;
  guests: GuestConnectorMap;
}

type GuestConnectorEvent<
  Type extends string = string,
  Detail = EventDetail
> = NamedEvent<
  Type,
  Detail &
    EventDetail & {
      connector: UIXGuestConnector;
    }
>;

export type GuestConnectorEvents =
  | GuestConnectorEvent<"hostprovide">
  | GuestConnectorEvent<"beforecallhostmethod", HostMethodAddress>;

export interface UIXGuestConnector extends Emits<GuestConnectorEvents> {
  load(): Promise<NamespacedApis>;
  isLoading(): boolean;
  id: string;
  hasCapabilities<Apis extends NamespacedApis>(
    requiredMethods: RequiredMethodsByName<Apis>
  ): boolean;
  provide(apis: NamespacedApis): void;
}

type GuestEvent<
  Type extends string = string,
  Detail = EventDetail
> = NamedEvent<Type, Detail & EventDetail>;

export type GuestEvents = GuestEvent<"connect"> | GuestEvent<"provide">;

export interface UIXGuestOptions {
  timeout?: number;
  register?: NamespacedApis;
}

export interface UIXGuest extends Emits<GuestEvents> {
  host: NamespacedApis;
  register(apis: NamespacedApis): Promise<void>;
}
