/**
 * Adapter to attach console logging listeners to a Host running in an app
 * @hidden
 */
import { debugEmitter } from "@adobe/uix-core";
import type { PortEvents } from "./port.js";
import type { Host, HostEvents } from "./host.js";

declare global {
  interface Window {
    __UIX_HOST?: Host;
  }
}

export function debugHost(host: Host) {
  window.__UIX_HOST = host;
  const hostLogger = debugEmitter<HostEvents>(host, {
    theme: "blue medium",
    type: "Host",
  });
  hostLogger
    .listen("guestbeforeload", (log, event) => {
      const {
        detail: { guest },
      } = event;
      log.info(event, "Guest ID %s", guest.id);
      const portLogger = debugEmitter<PortEvents>(guest, {
        theme: "green medium",
        type: "Port",
        id: `${host.id} ➔ ${guest.id}`,
      });
      portLogger
        .listen("hostprovide", (log, event) => {
          log.info("received APIs", event.detail.apis);
        })
        .listen("beforecallhostmethod", (log, event) => {
          log.info(event.detail);
        })
        .listen("unload", (log, event) => {
          log.info(event.detail);
          log.detach();
        });
    })
    .listen("guestload", (log, e) => {
      log.info(e.detail.guest.id, e.detail.guest);
    })
    .listen("error", (log, e) => {
      log.error(`Error: ${e.detail.error.message}`, e);
    })
    .listen("loadallguests", (log, e) => {
      log.info("%d guests loaded", e.detail.host.guests.size, e.detail.host);
    })
    .listen("unload", (log) => {
      log.info("Unloaded guest and container.");
      log.detach();
    });
}
