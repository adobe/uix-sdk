import type { WrappedMessage } from "./message-wrapper";
import { wrap } from "./message-wrapper";
import { ObjectSimulator } from "./object-simulator";
import type { Asynced } from "./object-walker";
import { timeoutPromise } from "./promises/timed";
import { receiveCalls } from "./rpc";
import type { InitTicket } from "./tickets";
import { INIT_TICKET } from "./tickets";
import type { TunnelConfig } from "./tunnel";
import { Tunnel } from "./tunnel";

const INIT_MESSAGE: WrappedMessage<InitTicket> = wrap(INIT_TICKET);

export interface Phantogram<ExpectedApi> {
  tunnel: Tunnel;
  getRemoteApi(): Asynced<ExpectedApi>;
}

async function setupApiExchange<T>(
  tunnel: Tunnel,
  apiToSend: unknown
): Promise<Phantogram<T>> {
  let done = false;
  let remoteApi!: Asynced<T>;
  const phantogram: Phantogram<T> = {
    tunnel,
    getRemoteApi(): Asynced<T> {
      return remoteApi;
    },
  };
  return timeoutPromise(
    "Initial API exchange",
    new Promise((resolve, reject) => {
      const simulator = ObjectSimulator.create(tunnel, FinalizationRegistry);

      const sendApi: Function = simulator.makeSender(INIT_MESSAGE);
      const apiCallback = (api: Asynced<T>) => {
        remoteApi = api;
        if (!done) {
          done = true;
          resolve(phantogram);
        }
      };
      tunnel.on("api", apiCallback);

      const unsubscribe = receiveCalls(
        tunnel.emit.bind(tunnel, "api"),
        INIT_TICKET,
        new WeakRef(simulator.subject)
      );
      const destroy = (e: Error) => {
        unsubscribe();
        if (!done) {
          done = true;
          reject(e);
        }
      };
      tunnel.on("destroyed", destroy);
      sendApi(apiToSend).catch(destroy);
    }),
    tunnel.config.timeout,
    () => tunnel.destroy()
  );
}

export async function connectParentWindow<Expected>(
  tunnelOptions: Partial<TunnelConfig>,
  apiToSend: unknown
): Promise<Phantogram<Expected>> {
  const tunnel = Tunnel.toParent(window.parent, tunnelOptions);
  return setupApiExchange<Expected>(tunnel, apiToSend);
}

export async function connectIframe<Expected>(
  frame: HTMLIFrameElement,
  tunnelOptions: Partial<TunnelConfig>,
  apiToSend: unknown
): Promise<Phantogram<Expected>> {
  const tunnel = await Tunnel.toIframe(frame, tunnelOptions);
  return setupApiExchange<Expected>(tunnel, apiToSend);
}
