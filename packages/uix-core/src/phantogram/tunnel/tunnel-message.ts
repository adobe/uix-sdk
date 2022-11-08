import { NS_ROOT, VERSION } from "../constants";
import { isPlainObject } from "../value-assertions";
import { WrappedMessage, isWrapped, wrap, unwrap } from "../message-wrapper";
import { HandshakeAcceptedTicket, HandshakeOfferedTicket } from "../tickets";

type Handshake = HandshakeAcceptedTicket | HandshakeOfferedTicket;
type HandshakeMessage =
  | WrappedMessage<HandshakeAcceptedTicket>
  | WrappedMessage<HandshakeOfferedTicket>;

const VERSION_WARNINGS = new Set();

export function resetWarnings() {
  VERSION_WARNINGS.clear();
}

export function makeAccepted(
  key: string
): WrappedMessage<HandshakeAcceptedTicket> {
  return wrap({
    key,
    type: "handshake_accepted",
    version: VERSION,
  });
}
export function makeOffered(
  key: string
): WrappedMessage<HandshakeOfferedTicket> {
  return wrap({
    key,
    type: "handshake_offered",
    version: VERSION,
  });
}
export function is(message: unknown): message is HandshakeMessage {
  if (!isWrapped(message)) {
    return false;
  }
  const tunnelData: Handshake = unwrap<Handshake>(message as HandshakeMessage);
  if (
    !isPlainObject(tunnelData) ||
    typeof tunnelData.key !== "string" ||
    typeof tunnelData.version !== "string" ||
    typeof tunnelData.type !== "string"
  ) {
    console.error(
      `malformed tunnel message, message.${NS_ROOT} must be an object with a "version" string, a "type" string, and a "key" string`
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

export default { makeOffered, makeAccepted, is, resetWarnings };
