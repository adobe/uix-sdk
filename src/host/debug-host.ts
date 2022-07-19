import { customConsole } from "../common/debuglog";
import { UIXHost } from "../common/types";

declare global {
  interface Window {
    __UIX_HOST?: UIXHost;
  }
}

export function debugHost(tag: string, host: typeof window.__UIX_HOST) {
  window.__UIX_HOST = host;
  const hostLogger = customConsole("yellow", "Host", tag);
  const subscriptions = [
    host.addEventListener("guestbeforeload", ({ detail: { guest } }) => {
      hostLogger.info('️⚡️️ guestbeforeload Guest ID "%s"', guest.id);
      const guestLogger = customConsole(
        "yellow",
        "Guest",
        guest.id,
        hostLogger
      );
      subscriptions.push(
        guest.addEventListener("hostprovide", ({ detail: { apis } }) => {
          guestLogger.info(
            "⚡️️ hostprovide Guest ID %s received APIs",
            guest.id,
            apis
          );
        })
      );
    }),
    host.addEventListener("guestload", (e) => {
      hostLogger.info(
        '⚡️ guestload Guest ID "%s"',
        e.detail.guest.id,
        e.detail.guest
      );
    }),
    host.addEventListener("error", (e) => {
      hostLogger.error(`Error: ${e.detail.error.message}`, e);
    }),
    host.addEventListener("loadallguests", (e) => {
      hostLogger.info(
        "⚡️ loadallguests All %d guests loaded",
        e.detail.host.guests.size,
        e.detail.host
      );
    }),
    host.addEventListener("unload", () =>
      hostLogger.info("⚡️ unload Unloaded guest and container.")
    ),
  ];
  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}
