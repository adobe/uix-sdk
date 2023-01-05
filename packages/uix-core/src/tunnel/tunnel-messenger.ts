import { NS_ROOT, VERSION } from "../constants";
import { isPlainObject } from "../value-assertions";
import { WrappedMessage, isWrapped, wrap, unwrap } from "../message-wrapper";
import { HandshakeAcceptedTicket, HandshakeOfferedTicket } from "../tickets";

type Handshake = HandshakeAcceptedTicket | HandshakeOfferedTicket;
type HandshakeAccepted = WrappedMessage<HandshakeAcceptedTicket>;
type HandshakeOffered = WrappedMessage<HandshakeOfferedTicket>;
type HandshakeMessage = HandshakeAccepted | HandshakeOffered;

export class TunnelMessenger {
  private myOrigin: string;
  private remoteOrigin: string;
  private logger: Console;
  private versionWarnings = new Set<string>();
  constructor(opts: {
    myOrigin: string;
    targetOrigin: string;
    logger: Console;
  }) {
    this.myOrigin = opts.myOrigin;
    this.remoteOrigin =
      opts.targetOrigin === "*" ? "remote document" : opts.targetOrigin;
    this.logger = opts.logger;
  }
  resetWarnings() {
    this.versionWarnings.clear();
  }

  makeAccepted(id: string): HandshakeAccepted {
    return wrap({
      accepts: id,
      version: VERSION,
    });
  }
  makeOffered(id: string): HandshakeOffered {
    return wrap({
      offers: id,
      version: VERSION,
    });
  }
  isHandshakeAccepting(
    message: unknown,
    id: string
  ): message is HandshakeAccepted {
    return (
      this.isHandshake(message) &&
      unwrap(message as HandshakeAccepted).accepts === id
    );
  }
  isHandshakeOffer(message: unknown): message is HandshakeOffered {
    return (
      this.isHandshake(message) &&
      typeof unwrap(message as HandshakeOffered).offers === "string"
    );
  }
  isHandshake(message: unknown): message is HandshakeMessage {
    if (!isWrapped(message)) {
      this.logMalformed(message);
      return false;
    }
    const tunnelData: Handshake = unwrap<Handshake>(
      message as HandshakeMessage
    );
    if (
      !isPlainObject(tunnelData) ||
      typeof tunnelData.version !== "string" ||
      !(Reflect.has(tunnelData, "accepts") || Reflect.has(tunnelData, "offers"))
    ) {
      this.logMalformed(message);
      return false;
    }
    const { version } = tunnelData;
    if (version !== VERSION && !this.versionWarnings.has(version)) {
      this.versionWarnings.add(version);
      this.logger.warn(
        `SDK version mismatch. ${this.myOrigin} is using v${VERSION}, but received message from ${this.remoteOrigin} using SDK v${version}. Extensions may be broken or unresponsive.`
      );
    }
    return true;
  }
  private logMalformed(message: unknown) {
    let inspectedMessage: string;
    try {
      inspectedMessage = JSON.stringify(message, null, 2);
    } catch (_) {
      try {
        inspectedMessage = message.toString();
      } catch (e) {
        inspectedMessage = Object.prototype.toString.call(message);
      }
    }
    this.logger.error(
      `Malformed tunnel message sent from SDK at ${this.remoteOrigin} to ${this.myOrigin}:
${inspectedMessage}
Message must be an object with "${NS_ROOT}" property, which must be an object with a "version" string and an either an "accepts" or "offers" property containing an ID string.`
    );
  }
}
