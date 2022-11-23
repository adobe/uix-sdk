import { NS_ROOT, VERSION } from "../constants";
import { isPlainObject } from "../value-assertions";
import { WrappedMessage, isWrapped, wrap, unwrap } from "../message-wrapper";
import { HandshakeAcceptedTicket, HandshakeOfferedTicket } from "../tickets";

type Handshake = HandshakeAcceptedTicket | HandshakeOfferedTicket;
type HandshakeAccepted = WrappedMessage<HandshakeAcceptedTicket>;
type HandshakeOffered = WrappedMessage<HandshakeOfferedTicket>;
type HandshakeMessage = HandshakeAccepted | HandshakeOffered;

const VERSION_WARNINGS = new Set();

export function resetWarnings() {
  VERSION_WARNINGS.clear();
}

export function makeAccepted(id: string): HandshakeAccepted {
  return wrap({
    accepts: id,
    version: VERSION,
  });
}
export function makeOffered(id: string): HandshakeOffered {
  return wrap({
    offers: id,
    version: VERSION,
  });
}
export function isHandshakeAccepting(
  message: unknown,
  id: string
): message is HandshakeAccepted {
  return (
    isHandshake(message) && unwrap(message as HandshakeAccepted).accepts === id
  );
}
export function isHandshakeOffer(
  message: unknown
): message is HandshakeOffered {
  return (
    isHandshake(message) &&
    typeof unwrap(message as HandshakeOffered).offers === "string"
  );
}
export function isHandshake(message: unknown): message is HandshakeMessage {
  if (!isWrapped(message)) {
    return false;
  }
  const tunnelData: Handshake = unwrap<Handshake>(message as HandshakeMessage);
  if (
    !isPlainObject(tunnelData) ||
    typeof tunnelData.version !== "string" ||
    !(Reflect.has(tunnelData, "accepts") || Reflect.has(tunnelData, "offers"))
  ) {
    console.error(
      `malformed tunnel message, message.${NS_ROOT} must be an object with a "version" string and an either an "accepts" or "offers" property containing an ID string.`
    );
    return false;
  }
  const { version } = tunnelData;
  if (version !== VERSION && !VERSION_WARNINGS.has(version)) {
    VERSION_WARNINGS.add(version);
    console.warn(
      `Version mismatch: current Tunnel is ${VERSION} and remote Tunnel is ${version}. May cause problems.`
    );
  }
  return true;
}

export default {
  makeOffered,
  makeAccepted,
  isHandshake,
  resetWarnings,
};
