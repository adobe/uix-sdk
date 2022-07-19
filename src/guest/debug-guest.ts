import { customConsole } from "../common/debuglog";
import { UIXGuest } from "../common/types";

declare global {
  interface Window {
    __UIX_GUEST?: UIXGuest;
  }
}

export default function debugGuest(
  tag: string,
  host: typeof window.__UIX_HOST
) {
  window.__UIX_HOST = host;
  const hostLogger = customConsole("yellow", "Host", tag);
  host.addEventListener("guestbeforeload", ({ detail: { guest } }) => {
    hostLogger.info('Loading guest "%s"', guest.id);
    const guestLogger = customConsole("yellow", "Guest", guest.id, hostLogger);
    const subscriptions = [];
    subscriptions.push(
      guest.addEventListener("hostprovide", ({ detail: { apis } }) => {
        guestLogger.info("Guest %s received APIs", guest.id, apis);
      })
    );
  });
  host.addEventListener("guestload", (e) => {
    hostLogger.info('Guest "%s" loaded', e.detail.guest);
  });
  host.addEventListener("error", (e) => {
    hostLogger.error(`Guest "%s" failed to load: ${e.detail.error.message}`, e);
  });
  host.addEventListener("loadallguests", (e) => {
    hostLogger.info(
      "All %d guests loaded",
      e.detail.host.guests.size,
      e.detail.host
    );
  });
}
