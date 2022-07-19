import { customConsole } from "../common/debuglog";
import { UIXGuest } from "../common/types";

declare global {
  interface Window {
    __UIX_GUEST?: UIXGuest;
  }
}

export function debugGuest(guest: typeof window.__UIX_GUEST) {
  window.__UIX_GUEST = guest;
  const guestLogger = customConsole("green", "Guest", guest.id);
  const subscriptions = [
    guest.addEventListener("beforeconnect", ({ detail: { guest } }) => {
      guestLogger.info("⚡️ beforeconnect", guest);
    }),
    guest.addEventListener("connecting", ({ detail: { connection } }) => {
      guestLogger.info("⚡️ connecting", connection);
    }),
    guest.addEventListener("connected", ({ detail: { guest } }) => {
      guestLogger.info("⚡️ connected", guest);
    }),
    guest.addEventListener("error", ({ detail: { error, guest } }) => {
      guestLogger.error(
        "❌ Failed to connect! %s",
        error.message,
        guest,
        error
      );
    }),
  ];
  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}
