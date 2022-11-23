import EventEmitter from "eventemitter3";
import { isIframe, isTunnelSource } from "../value-assertions";
import {
  isHandshakeAccepting,
  isHandshakeOffer,
  makeAccepted,
  makeOffered,
} from "./tunnel-message";
import { unwrap } from "../message-wrapper";

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

export class Tunnel extends EventEmitter {
  // #region Properties

  private _messagePort: MessagePort;

  config: TunnelConfig;

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
   * Returns a Promise that resolves with a connected tunnel if the page in the
   * provided iframe has called {@link toParent}. The tunnel may reconnect if
   * the iframe reloads, in which case it will emit another "connected" event.
   *
   * @example
   * ```ts
   * const iframe = document.createElement('iframe');
   *
   * ```
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
    const source = target.contentWindow;
    const config = Tunnel._normalizeConfig(options);
    const tunnel = new Tunnel(config);
    let frameStatusCheck: number;
    let timeout: number;
    const offerListener = (event: MessageEvent) => {
      if (
        isFromOrigin(event, source, config.targetOrigin) &&
        isHandshakeOffer(event.data)
      ) {
        const accepted = makeAccepted(unwrap(event.data).offers);
        const channel = new MessageChannel();
        source.postMessage(accepted, config.targetOrigin, [channel.port1]);
        tunnel.connect(channel.port2);
      }
    };
    const cleanup = () => {
      clearTimeout(timeout);
      clearInterval(frameStatusCheck);
      window.removeEventListener("message", offerListener);
    };
    timeout = window.setTimeout(() => {
      tunnel.emit(
        "error",
        new Error(
          `Timed out awaiting initial message from iframe after ${config.timeout}ms`
        )
      );
      tunnel.destroy();
    }, config.timeout);

    tunnel.on("destroyed", cleanup);
    tunnel.on("connected", () => clearTimeout(timeout));

    /**
     * Check if the iframe has been unexpectedly removed from the DOM (for
     * example, by React). Unsubscribe event listeners and destroy tunnel.
     */
    frameStatusCheck = window.setInterval(() => {
      if (!target.isConnected) {
        tunnel.destroy();
      }
    }, STATUSCHECK_MS);

    window.addEventListener("message", offerListener);

    return tunnel;
  }

  static toParent(source: WindowProxy, opts: Partial<TunnelConfig>): Tunnel {
    let retrying: number;
    let timeout: number;
    let timedOut = false;
    const key = makeKey();
    const config = Tunnel._normalizeConfig(opts);
    const tunnel = new Tunnel(config);
    const acceptListener = (event: MessageEvent) => {
      if (
        !timedOut &&
        isFromOrigin(event, source, config.targetOrigin) &&
        isHandshakeAccepting(event.data, key)
      ) {
        cleanup();
        if (!event.ports || !event.ports.length) {
          const portError = new Error(
            "Received handshake accept message, but it did not include a MessagePort to establish tunnel"
          );
          tunnel.emit("error", portError);
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
      tunnel.emit(
        "error",
        new Error(
          `Timed out waiting for initial response from parent after ${config.timeout}ms`
        )
      );
      tunnel.destroy();
    }, config.timeout);

    window.addEventListener("message", acceptListener);
    tunnel.on("destroyed", cleanup);
    tunnel.on("connected", cleanup);

    const sendOffer = () =>
      source.postMessage(makeOffered(key), config.targetOrigin);
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
    this.emitRemote("connected");
    this._messagePort.start();
  }

  destroy(): void {
    if (this._messagePort) {
      this._messagePort.close();
      this._messagePort = null;
    }
    this.emit("destroyed");
    this.emitRemote("destroyed");
    // this.removeAllListeners(); // TODO: maybe necessary for memory leaks
  }

  emitRemote(type: string, payload?: unknown): boolean {
    if (!this._messagePort) {
      return false;
    }
    this._messagePort.postMessage({ type, payload });
    return true;
  }

  // #endregion Public Methods

  // #region Private Static Methods

  private static _normalizeConfig(
    options: Partial<TunnelConfig> = {}
  ): TunnelConfig {
    let errorMessage = "";
    const config: Partial<TunnelConfig> = {
      timeout: 4000,
      ...options,
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
    this.emit(type, payload);
  };

  // #endregion Private Methods
}
