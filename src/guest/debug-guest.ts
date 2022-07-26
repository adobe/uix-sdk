/**
 * Adapter to attach console logging listeners to a Guest running in a frame/
 * @hidden
 */
import { debugEmitter } from "../common/debug-emitter.js";
import type { GuestEvents, Guest } from "./guest.js";

declare global {
  interface Window {
    __UIX_GUEST?: Guest;
  }
}

export function debugGuest(guest: Guest) {
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
