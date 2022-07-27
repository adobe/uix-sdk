/* eslint @typescript-eslint/no-explicit-any: "off" */
import { AsyncMethodReturns, Connection, connectToParent } from "penpal";
import type {
  HostConnection,
  NamespacedApis,
  NamedEvent,
} from "@adobe/uix-core";
import { Emitter, makeNamespaceProxy, timeoutPromise } from "@adobe/uix-core";

type GuestEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = NamedEvent<
  Type,
  Detail &
    Record<string, unknown> & {
      guest: Guest;
    }
>;
export type GuestEvents =
  | GuestEvent<"beforeconnect">
  | GuestEvent<"connecting", { connection: Connection }>
  | GuestEvent<"connected", { connection: Connection }>
  | GuestEvent<"error", { error: Error }>;

interface GuestConfig {
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
  register?: NamespacedApis;
}

/**
 *
 * TODO: document Guest
 * @public
 *
 */
export class Guest extends Emitter<GuestEvents> {
  constructor(config: GuestConfig) {
    super(config.id);
    if (typeof config.timeout === "number") {
      this.timeout = config.timeout;
    }
    if (config.debug) {
      this.debug = import("./debug-guest.js")
        .then(({ debugGuest }) => {
          debugGuest(this);
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
  host: NamespacedApis = makeNamespaceProxy(async (address) => {
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
  private localMethods: NamespacedApis;
  private hostConnection!: AsyncMethodReturns<HostConnection>;
  private debug: Promise<boolean>;
  async register(apis: NamespacedApis) {
    await this.debug;
    this.localMethods = apis;
    await this.connect();
  }
  private async connect() {
    this.emit("beforeconnect", { guest: this });
    try {
      const connection = connectToParent<HostConnection>({
        timeout: this.timeout,
        methods: this.localMethods,
      });

      this.emit("connecting", { guest: this, connection });
      this.hostConnectionPromise = connection.promise;
      this.hostConnection = await this.hostConnectionPromise;
      this.emit("connected", { guest: this, connection });
    } catch (e) {
      this.emit("error", { guest: this, error: e });
      console.error("connection failed", e);
    }
  }
}

export function createGuest(config: GuestConfig) {
  const guest = new Guest(config);
  return guest;
}

export default createGuest;
