import { debugEmitter } from "../common/debug-emitter";
import { GuestEvents, UIXGuest } from "../common/types";

declare global {
  interface Window {
    __UIX_GUEST?: UIXGuest;
  }
}

export function debugGuest(guest: UIXGuest) {
  window.__UIX_GUEST = guest;
  debugEmitter<GuestEvents>(guest, {
    theme: "yellow medium",
  })
    .listen("beforeconnect", (log, { detail: { guest } }) => {
      log.info(guest);
    })
    .listen("connecting", (log, { detail: { connection } }) => {
      log.info(connection);
    })
    .listen("connected", (log, { detail: { guest } }) => {
      log.info(guest);
    })
    .listen("error", (log, { detail: { error, guest } }) => {
      log.error("❌ Failed to connect! %s", error.message, guest, error);
    });
}
