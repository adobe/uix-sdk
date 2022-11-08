/**
 * Create an independent, named tunnel to a remote Window or Worker object.
 */
import * as TunnelMessage from "./tunnel-message";
import { timeoutPromise } from "../promises/timed";
import { SYM_CLEANUP } from "../constants";
import { unwrap, WrappedMessage } from "../message-wrapper";
import { HandshakeOfferedTicket } from "../tickets";
import { hasProp } from "../value-assertions";
import { MessageTarget, MessageSource } from "../postables";

/** @internal */
interface SeparateRemotes {
  postTo: MessageTarget;
  receiveFrom: MessageSource;
}

/** @internal */
type Remote = Window | SeparateRemotes;

/** @internal */
type Remoteable = Remote | HTMLIFrameElement;

interface CleanableMessagePort extends MessagePort {
  [SYM_CLEANUP](): void;
}

/** @internal */
export interface TunnelOptions {
  key: string;
  targetOrigin: string;
  remote: Remoteable;
  timeout?: number;
}

/** @internal */
export interface TunnelConfig extends TunnelOptions {
  remote: SeparateRemotes;
}

function extractRemotePair(remote: Remoteable): SeparateRemotes {
  // common cases
  if (remote instanceof HTMLIFrameElement) {
    return {
      postTo: remote.contentWindow,
      receiveFrom: window,
    };
  }
  if (remote === window.parent) {
    return {
      postTo: window.parent,
      receiveFrom: window,
    };
  }
  const hasPostTo = hasProp(remote, "postTo");
  const hasReceiveFrom = hasProp(remote, "receiveFrom");
  if (hasPostTo || hasReceiveFrom) {
    if (!(hasPostTo && hasReceiveFrom)) {
      throw new Error(
        `A configuration with separate remotes must have both a "postTo" and a "receiveFrom"`
      );
    }
    return remote as SeparateRemotes;
  }
  return { postTo: remote, receiveFrom: remote } as SeparateRemotes;
}

export async function createTunnel(
  config: TunnelOptions
): Promise<CleanableMessagePort> {
  if (!config || typeof config !== "object") {
    throw new Error(
      "tunnel requires a config object with a key and a window/worker/postMessage object"
    );
  }
  const { key, targetOrigin, remote, timeout = 4000 } = config;

  const validationMessages = [];
  if (!key || typeof key !== "string") {
    validationMessages.push(
      "tunnel requires a string key to match with the remote tunnel object"
    );
  }
  if (typeof timeout !== "number") {
    validationMessages.push("timeout value must be a number of milliseconds");
  }
  if (!targetOrigin || typeof targetOrigin !== "string") {
    validationMessages.push(
      'tunnel requires a URL string target origin. set targetOrigin to "*" to be deliberately unsafe and allow any origin'
    );
  } else if (targetOrigin !== "*") {
    try {
      if (new URL(targetOrigin).origin !== targetOrigin) {
        validationMessages.push(
          "target origin must be only a URL origin scheme://host:port with no other URL segments"
        );
      }
    } catch (e) {
      validationMessages.push(
        'target origin must either be a valid URL origin or a "*" to be deliberately unsafe and allow any origin'
      );
    }
  }
  const { postTo, receiveFrom } = extractRemotePair(remote);
  if (!postTo || typeof postTo.postMessage !== "function") {
    validationMessages.push("postTo object must have a postMessage method");
  }
  if (
    !receiveFrom ||
    typeof receiveFrom.addEventListener !== "function" ||
    typeof receiveFrom.removeEventListener !== "function"
  ) {
    validationMessages.push("receiveFrom object must be an event listener");
  }

  if (validationMessages.length > 0) {
    throw new Error(`invalid config:
 - ${validationMessages.join("\n - ")}`);
  }

  /* istanbul ignore next */
  const isFromTarget =
    targetOrigin === "*"
      ? () => true
      : (event: MessageEvent) => {
          return event.origin === targetOrigin;
        };

  function tryClose(...ports: MessagePort[]) {
    /* istanbul ignore next */
    ports.forEach((port) => {
      try {
        port.close();
      } catch (e) {
        console.error("Failed to cleanup port", e);
      }
    });
  }

  let myChannel: MessageChannel;
  let portChosen: MessagePort;
  const cleanup = () => {
    if (portChosen) {
      tryClose(portChosen);
    }
    if (myChannel) {
      tryClose(myChannel.port1, myChannel.port2);
    }
  };

  return timeoutPromise(
    "MessageChannel handshake",
    new Promise((resolve, reject) => {
      const tunnelFail = (message: string) => {
        cleanup();
        reject(new Error(message));
      };
      const choosePort = (port: MessagePort) => {
        portChosen = port;
        Object.defineProperty(port, SYM_CLEANUP, {
          value: cleanup,
        });
        resolve(port as CleanableMessagePort);
      };
      try {
        myChannel = new MessageChannel();
        const retractMyOffer = () => {
          receiveFrom.removeEventListener("message", receiveHandshake);
          tryClose(myChannel.port1, myChannel.port2);
        };
        const receiveHandshake = (event: Event) => {
          const msgEvent = event as MessageEvent;
          if (!(isFromTarget(msgEvent) && TunnelMessage.is(msgEvent.data))) {
            return;
          }
          const msg = unwrap(
            msgEvent.data as WrappedMessage<HandshakeOfferedTicket>
          );
          if (msg.type === "handshake_offered") {
            try {
              /* istanbul ignore if */
              if (portChosen) {
                retractMyOffer();
                return;
              }
              if (msg.key !== key) {
                return;
              }
              retractMyOffer();
              const offeredPort = msgEvent.ports[0];
              try {
                postTo.postMessage(
                  TunnelMessage.makeAccepted(key),
                  targetOrigin
                );
              } catch (e) {
                // if (!e.message.includes("origin")) {
                throw e;
                // }
              }
              choosePort(offeredPort);
            } catch (e) {
              tunnelFail(`Failed to handle handshake_offered event: ${e}`);
            }
          } else if (msg.type === "handshake_accepted") {
            try {
              if (msg.key !== key) {
                return;
              }
              receiveFrom.removeEventListener("message", receiveHandshake);
              choosePort(myChannel.port1);
            } catch (e) {
              tunnelFail(`Failed to handle handshake_accepted event: ${e}`);
            }
          }
        };
        receiveFrom.addEventListener("message", receiveHandshake);
        try {
          postTo.postMessage(TunnelMessage.makeOffered(key), targetOrigin, [
            myChannel.port2,
          ]);
        } catch (e) {
          // if (!e.message.includes("origin")) {
          throw e;
          // }
        }
      } catch (e) {
        tunnelFail(`Failed to create tunnel: ${e}`);
      }
    }),
    timeout,
    cleanup
  );
}

export function destroyTunnel(tunnelPort: CleanableMessagePort) {
  tunnelPort[SYM_CLEANUP]();
}
