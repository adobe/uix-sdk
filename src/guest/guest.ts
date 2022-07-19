/* eslint @typescript-eslint/no-explicit-any: "off" */
import { AsyncMethodReturns, connectToParent } from "penpal";
import {
  GuestEvents,
  HostConnection,
  NamespacedApis,
  UIXGuest,
  UIXGuestOptions,
} from "../common/types";
import { Emitter } from "../common/emitter";
import { timeoutPromise } from "../common/timeout-promise";
import { makeNamespaceProxy } from "../common/namespace-proxy";

class GuestInFrame extends Emitter<GuestEvents> implements UIXGuest {
  constructor(options: UIXGuestOptions) {
    super();
    if (typeof options.timeout === "number") {
      this.timeout = options.timeout;
    }
  }
  host: NamespacedApis = makeNamespaceProxy(async (address) => {
    const hostConnection = await this.hostConnectionPromise;
    try {
      const result = await timeoutPromise(
        10000,
        hostConnection.invokeHostMethod(address)
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
  async register(apis: NamespacedApis) {
    this.localMethods = apis;
    await this.connect();
  }
  private async connect() {
    try {
      const connection = connectToParent<HostConnection>({
        timeout: this.timeout,
        methods: this.localMethods,
      });
      this.hostConnectionPromise = connection.promise;
      console.debug("connection began", connection);
      this.hostConnection = await this.hostConnectionPromise;
      console.debug("connection established", this.hostConnection);
    } catch (e) {
      console.error("connection failed", e);
    }
  }
}

export default function createGuest(options: UIXGuestOptions = {}) {
  const guest = new GuestInFrame(options);
  return guest;
}
