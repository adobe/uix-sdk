/* eslint @typescript-eslint/no-explicit-any: "off" */
import { AsyncMethodReturns, Connection, connectToParent } from "penpal";
import type {
  RemoteApis,
  LocalApis,
  HostConnection,
  NamedEvent,
} from "@adobe/uix-core";
import { Emitter, makeNamespaceProxy, timeoutPromise } from "@adobe/uix-core";

type GuestEvent<
  Outgoing extends object,
  Incoming extends object,
  Type extends string = string,
  Detail = Record<string, unknown>
> = NamedEvent<
  Type,
  Detail &
    Record<string, unknown> & {
      guest: Guest<Outgoing, Incoming>;
    }
>;
export type GuestEvents<Outgoing extends object, Incoming extends object> =
  | GuestEvent<Outgoing, Incoming, "beforeconnect">
  | GuestEvent<Outgoing, Incoming, "connecting", { connection: Connection }>
  | GuestEvent<Outgoing, Incoming, "connected", { connection: Connection }>
  | GuestEvent<Outgoing, Incoming, "error", { error: Error }>;

interface GuestConfig<GuestApi> {
  /**
   * String slug identifying extension. This may need to use IDs from an
   * external system in the future.
   */
  id: string;
  /**
   * Set debug flags on all libraries that have them, and add loggers to SDK
   * objects. Log a lot to the console.
   */
  debug?: boolean;
  /**
   * Time out and stop trying to reach the host after this many milliseconds
   */
  timeout?: number;
  /**
   * You can pass an object to register into the constructor, as a shortcut to
   * calling `guest.register()`
   */
  register?: LocalApis<GuestApi>;
}

class ReadOnlySharedContext {
  private _map: Map<string, unknown>;
  constructor(values: Record<string, unknown>) {
    this._map = new Map(Object.entries(values));
  }
  get(key: string) {
    return this._map.get(key);
  }
}

/**
 *
 * TODO: document Guest
 * @public
 *
 */
export class Guest<Outgoing extends object, Incoming extends object> extends Emitter<
  GuestEvents<Outgoing, Incoming>
> {
  sharedContext: ReadOnlySharedContext;
  constructor(config: GuestConfig<Outgoing>) {
    super(config.id);
    if (typeof config.timeout === "number") {
      this.timeout = config.timeout;
    }
    if (process.env.NODE_ENV === "development") {
      this.debug =
        config.debug &&
        import("./debug-guest.js")
          .then(({ debugGuest }) => {
            debugGuest<Outgoing, Incoming>(this);
            return true;
          })
          .catch((e) => {
            console.error(
              "Failed to attach debugger to UIX host %s",
              this.id,
              this,
              e
            );
            // noop unsubscriber
            return false;
          });
    }
  }
  host: RemoteApis<Incoming> = makeNamespaceProxy<Incoming>(async (address) => {
    await this.hostConnectionPromise;
    try {
      const result = await timeoutPromise(
        10000,
        this.hostConnection.invokeHostMethod(address)
      );
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(e as unknown as string);
      throw new Error(
        `Host method call host.${address.path.join(".")}() failed: ${
          error.message
        }`
      );
    }
  });
  private timeout = 10000;
  private hostConnectionPromise: Promise<AsyncMethodReturns<HostConnection>>;
  private localMethods: LocalApis<Outgoing>;
  private hostConnection!: AsyncMethodReturns<HostConnection>;
  private debug: Promise<boolean>;
  async register(apis: LocalApis<Outgoing>) {
    await this.debug;
    this.localMethods = apis;
    await this.connect();
  }
  private async connect() {
    this.emit("beforeconnect", { guest: this });
    try {
      const connection = connectToParent<HostConnection<Incoming>>({
        timeout: this.timeout,
        methods: {
          emit: (
            type: string,
            detail: { context: Record<string, unknown> }
          ) => {
            if (type === "contextchange") {
              this.sharedContext = new ReadOnlySharedContext(detail.context);
            }
          },
          apis: this.localMethods,
        },
      });

      this.emit("connecting", { guest: this, connection });
      this.hostConnectionPromise = connection.promise;
      this.hostConnection = await this.hostConnectionPromise;
      this.sharedContext = new ReadOnlySharedContext(
        await this.hostConnection.getSharedContext()
      );
      this.emit("connected", { guest: this, connection });
    } catch (e) {
      this.emit("error", { guest: this, error: e });
      console.error("connection failed", e);
    }
  }
}

export function createGuest<Outgoing extends object>(
  config: GuestConfig<Outgoing>
) {
  const guest = new Guest(config);
  return guest;
}

export default createGuest;
