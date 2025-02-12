import EventEmitter from "eventemitter3";
import { isIframe } from "../value-assertions";
import { TunnelMessenger } from "./tunnel-messenger";
import { unwrap } from "../message-wrapper";
import { quietConsole } from "../debuglog";

/**
 * Child iframe will send offer messages to parent at this frequency until one
 * is accepted or the attempt times out.
 * TODO: make configurable if ever necessary
 */
const RETRY_MS = 100;

/**
 * Child iframe may unexpectedly close or detach from DOM. It emits no event
 * when this happens, so we must poll it and destroy the tunnel when necessary.
 * TODO: make configurable if ever necessary
 */
const STATUSCHECK_MS = 5000;

/**
 * Semi-unique IDs allow multiple parallel connections to handshake on both parent
 * and child iframe. This generates a semi-random 8-char base 36 string.
 */
const KEY_BASE = 36;
const KEY_LENGTH = 8;
const KEY_EXP = KEY_BASE ** KEY_LENGTH;
const makeKey = () => Math.round(Math.random() * KEY_EXP).toString(KEY_BASE);

/** @alpha */
export interface TunnelConfig {
  // #region Properties

  /**
   * To ensure secure communication, target origin must be specified, so the
   * tunnel can't connect to an unauthorized domain. Can be '*' to disable
   * origin checks, but this is discouraged!
   */
  targetOrigin: string;
  /**
   * A Promise for a tunnel will reject if not connected within timeout (ms).
   * @defaultValue 4000
   */
  timeout: number;
  /**
   * Logger instance to use for debugging tunnel connection.
   */
  logger: Console;

  // #endregion Properties
}

const badTimeout = "\n - timeout value must be a number of milliseconds";
const badTargetOrigin =
  "\n - targetOrigin must be a valid URL origin or '*' for any origin";

function isFromOrigin(
  event: MessageEvent,
  source: WindowProxy,
  targetOrigin: string
) {
  try {
    return (
      source === event.source &&
      (targetOrigin === "*" || targetOrigin === new URL(event.origin).origin)
    );
  } catch (_) {
    return false;
  }
}

const { emit: emitOn } = EventEmitter.prototype;

/**
 * An EventEmitter across two documents. It emits events on the remote document
 * and takes subscribers from the local document.
 * @alpha
 */
export class Tunnel extends EventEmitter {
  // #region Properties

  private _messagePort: MessagePort;

  config: TunnelConfig;
  isConnected: boolean;

  // #endregion Properties

  // #region Constructors

  constructor(config: TunnelConfig) {
    super();
    this.config = config;
  }

  // #endregion Constructors

  // #region Public Static Methods

  /**
   * Create a Tunnel that connects to the page running in the provided iframe.
   *
   * @remarks
   * Returns a Tunnel that listens for connection requests from the page in the
   * provided iframe, which it will send periodically until timeout if that page
   * has called {@link Tunnel.toParent}. If it receives one, the Tunnel will accept the
   * connection and send an exclusive MessagePort to the xrobject on the other
   * end. The tunnel may reconnect if the iframe reloads, in which case it will
   * emit another "connected" event.
   *
   * @alpha
   */
  static toIframe(
    target: HTMLIFrameElement,
    options: Partial<TunnelConfig>
  ): Tunnel {
    if (!isIframe(target)) {
      throw new Error(
        `Provided tunnel target is not an iframe! ${Object.prototype.toString.call(
          target
        )}`
      );
    }

    const config = Tunnel._normalizeConfig(options);
    const tunnel = new Tunnel(config);
    const messenger = new TunnelMessenger({
      myOrigin: window.location.origin,
      targetOrigin: config.targetOrigin,
      logger: config.logger,
    });
    tunnel.on("destroyed", () =>
      config.logger.log(
        `Tunnel to iframe at ${config.targetOrigin} destroyed!`,
        tunnel,
        target
      )
    );
    tunnel.on("connected", () =>
      config.logger.log(
        `Tunnel to iframe at ${config.targetOrigin} connected!`,
        tunnel,
        target
      )
    );
    tunnel.on("error", (e) =>
      config.logger.log(
        `Tunnel to iframe at ${config.targetOrigin} error!`,
        tunnel,
        target,
        e
      )
    );
    let frameStatusCheck: number;
    let timeout: number;
    const offerListener = (event: MessageEvent) => {
      if (
        !tunnel.isConnected &&
        isFromOrigin(event, target.contentWindow, config.targetOrigin) &&
        messenger.isHandshakeOffer(event.data)
      ) {
        const accepted = messenger.makeAccepted(unwrap(event.data).offers);
        const channel = new MessageChannel();
        target.contentWindow.postMessage(accepted, config.targetOrigin, [
          channel.port1,
        ]);
        tunnel.connect(channel.port2);
      }
    };
    const cleanup = () => {
      clearTimeout(timeout);
      clearInterval(frameStatusCheck);
      window.removeEventListener("message", offerListener);
    };
    timeout = window.setTimeout(() => {
      tunnel.abort(
        new Error(
          `Timed out awaiting initial message from target iframe after ${config.timeout}ms`
        )
      );
    }, config.timeout);

    tunnel.on("destroyed", cleanup);
    tunnel.on("connected", () => clearTimeout(timeout));

    /**
     * Check if the iframe has been unexpectedly removed from the DOM (for
     * example, by React). Unsubscribe event listeners and destroy tunnel.
     */
    frameStatusCheck = window.setInterval(() => {
      if (!target.isConnected) {
        cleanup();
        if (tunnel.isConnected) {
          const frameDisconnectError = new Error(
            `Tunnel target iframe at ${tunnel.config.targetOrigin} was disconnected from the document!`
          );
          Object.assign(frameDisconnectError, { target });
          tunnel.abort(frameDisconnectError);
        } else {
          tunnel.destroy();
        }
      }
    }, STATUSCHECK_MS);

    window.addEventListener("message", offerListener);

    return tunnel;
  }

  /**
   * Create a Tunnel that connects to the page running in the parent window.
   *
   * @remarks
   * Returns a Tunnel that starts sending connection requests to the parent
   * window, sending them periodically until the window responds with an accept
   * message or the timeout passes. The parent window will accept the request if
   * it calls {@link Tunnel.toIframe}.
   *
   * @alpha
   */
  static toParent(source: WindowProxy, opts: Partial<TunnelConfig>): Tunnel {
    let retrying: number;
    let timeout: number;
    let timedOut = false;
    const key = makeKey();
    const config = Tunnel._normalizeConfig(opts);
    const tunnel = new Tunnel(config);
    tunnel.on("destroyed", () =>
      config.logger.log(`Tunnel ${key} to parent window destroyed!`, tunnel)
    );
    tunnel.on("connected", () =>
      config.logger.log(`Tunnel ${key} to parent window connected!`, tunnel)
    );
    tunnel.on("error", (e) =>
      config.logger.log(`Tunnel ${key} to parent window error!`, tunnel, e)
    );
    const messenger = new TunnelMessenger({
      myOrigin: window.location.origin,
      targetOrigin: config.targetOrigin,
      logger: config.logger,
    });
    const acceptListener = (event: MessageEvent) => {
      if (
        !timedOut &&
        isFromOrigin(event, source, config.targetOrigin) &&
        messenger.isHandshakeAccepting(event.data, key)
      ) {
        cleanup();
        if (!event.ports || !event.ports.length) {
          const portError = new Error(
            "Received handshake accept message, but it did not include a MessagePort to establish tunnel"
          );
          tunnel.emitLocal("error", portError);
          return;
        }
        tunnel.connect(event.ports[0]);
      }
    };
    const cleanup = () => {
      clearInterval(retrying);
      clearTimeout(timeout);
      window.removeEventListener("message", acceptListener);
    };

    timeout = window.setTimeout(() => {
      if (!timedOut) {
        timedOut = true;
        tunnel.abort(
          new Error(
            `Timed out waiting for initial response from parent after ${config.timeout}ms`
          )
        );
      }
    }, config.timeout);

    window.addEventListener("message", acceptListener);
    tunnel.on("destroyed", () => {
      cleanup();
    });
    tunnel.on("connected", () => {
      cleanup();
    });

    const sendOffer = () => {
      if (tunnel.isConnected) {
        clearInterval(retrying);
      } else {
        source.postMessage(messenger.makeOffered(key), config.targetOrigin);
      }
    };
    retrying = window.setInterval(sendOffer, RETRY_MS);
    sendOffer();

    return tunnel;
  }

  // #endregion Public Static Methods

  // #region Public Methods

  connect(remote: MessagePort) {
    if (this._messagePort) {
      this._messagePort.removeEventListener("message", this._emitFromMessage);
      this._messagePort.close();
    }
    this._messagePort = remote;
    remote.addEventListener("message", this._emitFromMessage);
    this.emitLocal("connected");
    this._messagePort.start();
    this.isConnected = true;
  }

  abort(error: Error): void {
    this.emitLocal("error", error);
    this.destroy(error);
  }

  destroy(e?: Error): void {
    if (this._messagePort) {
      this._messagePort.close();
      this._messagePort = null;
      this.isConnected = false;
    }
    // don't add the argument to the logging if it doesn't exist; otherwise, on
    // a normal destroy, it logs a confusing "undefined"
    const context = e ? [e] : [];
    this.emitLocal("destroyed", ...context);
    // this.removeAllListeners(); // TODO: maybe necessary for memory leaks
  }

  emit(type: string | symbol, payload?: unknown): boolean {
    if (!this._messagePort) {
      return false;
    }
    this._messagePort.postMessage({ type, payload });
    return true;
  }

  emitLocal = (type: string | symbol, payload?: unknown) => {
    return emitOn.call(this, type, payload);
  };

  // #endregion Public Methods

  // #region Private Static Methods

  private static _normalizeConfig(
    options: Partial<TunnelConfig> = {}
  ): TunnelConfig {
    let errorMessage = "";
    const config: Partial<TunnelConfig> = {
      timeout: 4000,
      ...options,
      logger: options.logger || quietConsole,
    };

    const timeoutMs = Number(config.timeout);
    if (!Number.isSafeInteger(timeoutMs)) {
      errorMessage += badTimeout;
    }
    if (config.targetOrigin !== "*") {
      try {
        new URL(config.targetOrigin);
      } catch (e) {
        errorMessage += badTargetOrigin;
      }
    }
    if (errorMessage) {
      throw new Error(`Invalid tunnel configuration: ${errorMessage}`);
    }
    return config as TunnelConfig;
  }

  // #endregion Private Static Methods

  // #region Private Methods

  private _emitFromMessage = ({ data: { type, payload } }: MessageEvent) => {
    this.emitLocal(type, payload);
  };

  // #endregion Private Methods
}
