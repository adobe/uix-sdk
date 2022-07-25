/* eslint @typescript-eslint/no-explicit-any: "off" */
import { AsyncMethodReturns, connectToParent } from "penpal";
import {
  GuestEvents,
  HostConnection,
  NamespacedApis,
  UIXGuest,
} from "../common/types.js";
import { Emitter } from "../common/emitter.js";
import { timeoutPromise } from "../common/timeout-promise.js";
import { makeNamespaceProxy } from "../common/namespace-proxy.js";

interface GuestConfig {
  id: string;
  debug?: boolean;
  timeout?: number;
  register?: NamespacedApis;
}

class Guest extends Emitter<GuestEvents> implements UIXGuest {
  constructor(config: GuestConfig) {
    super(config.id);
    if (typeof config.timeout === "number") {
      this.timeout = config.timeout;
    }
    if (config.debug) {
      this.debug = import("./debug-guest")
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

export default function createGuest(config: GuestConfig) {
  const guest = new Guest(config);
  return guest;
}
