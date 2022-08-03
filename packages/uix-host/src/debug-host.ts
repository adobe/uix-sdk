/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Adapter to attach console logging listeners to a Host running in an app
 * @hidden
 */
import { debugEmitter, Emits, GuestConnection } from "@adobe/uix-core";
import type { PortEvents } from "./port.js";
import type { HostEventLoadAllGuests, HostEvents } from "./host.js";

type GenericPortEvents = PortEvents<Record<string, unknown>>;

type Portlike = GuestConnection & Emits<GenericPortEvents>;

export function debugHost(host: Emits<HostEvents>) {
  const hostLogger = debugEmitter(host, {
    theme: "blue medium",
    type: "Host",
  });
  hostLogger
    .listen("guestbeforeload", (log, event) => {
      const { detail } = event;
      const guest = detail.guest as Portlike;
      log.info(event, `Guest ID ${guest.id}`);
      const portLogger = debugEmitter(guest, {
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
    .listen(
      "loadallguests",
      (log, { detail: { failed, host } }: HostEventLoadAllGuests) => {
        if (failed.length > 0) {
          log.error("%d guests failed to load!", failed.length);
        }
        log.info("%d guests loaded", failed, host);
      }
    )
    .listen("unload", (log) => {
      log.info("Unloaded guest and container.");
      log.detach();
    });
}
