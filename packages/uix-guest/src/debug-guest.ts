/**
 * Adapter to attach console logging listeners to a Guest running in a frame/
 * @hidden
 */
import { debugEmitter, Emits } from "@adobe/uix-core";
import { GuestEvents } from "./guest";

export function debugGuest<Out extends object, In extends object>(
  guest: Emits<GuestEvents<Out, In>>
) {
  debugEmitter(guest, {
    theme: "yellow medium",
    type: "Guest",
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
      log.error(
        "❌ Failed to connect! %s",
        (error as Error).message,
        guest,
        error
      );
    });
}
