/* eslint @typescript-eslint/no-explicit-any: "off" */
import { AsyncMethodReturns, connectToParent } from "penpal";
import {
  GuestEvents,
  HostConnection,
  NamespacedApis,
  UIXGuest,
  Unsubscriber,
} from "../common/types";
import { Emitter } from "../common/emitter";
import { timeoutPromise } from "../common/timeout-promise";
import { makeNamespaceProxy } from "../common/namespace-proxy";

interface GuestConfig {
  id: string;
  debug?: boolean;
  timeout?: number;
  register?: NamespacedApis;
}

class GuestInFrame extends Emitter<GuestEvents> implements UIXGuest {
  id: string;
  constructor(config: GuestConfig) {
    super();
    this.id = config.id;
    if (typeof config.timeout === "number") {
      this.timeout = config.timeout;
    }
    if (config.debug) {
      this.debug = import("./debug-guest")
        .then(({ debugGuest }) => debugGuest(this))
        .catch((e) => {
          console.error(
            "Failed to attach debugger to UIX host %s",
            this.id,
            this,
            e
          );
          // noop unsubscriber
          return () => undefined;
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
  private debug: Promise<Unsubscriber>;
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
  const guest = new GuestInFrame(config);
  return guest;
}
