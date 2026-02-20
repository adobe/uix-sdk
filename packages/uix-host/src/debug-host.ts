/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Adapter to attach console logging listeners to a Host running in an app
 * @hidden
 */
import type { Emits, EmitterDebugLogger, GuestEmitter } from "@adobe/uix-core";
import { debugEmitter } from "@adobe/uix-core";
import type { HostEventLoadAllGuests, HostEvents } from "./host.js";

export function debugHost(host: Emits<HostEvents>): EmitterDebugLogger {
  const hostLogger = debugEmitter(host, {
    theme: "blue medium",
    type: "Host",
  });

  hostLogger
    .listen("guestbeforeload", (log, event) => {
      const { detail } = event;
      const guest = detail.guest as GuestEmitter;

      log.info(event, `Guest ID ${guest.id}`);
      const portLogger = debugEmitter(guest, {
        id: `${host.id} ➔ ${guest.id}`,
        theme: "green medium",
        type: "Port",
      });

      portLogger
        .listen("hostprovide", (log, event) => {
          log.info("received APIs", event.detail.apis);
        })
        .listen("beforecallhostmethod", (log, event) => {
          log.info(event.detail);
        })
        .listen("guestresize", (log, event) => {
          log.info(event.detail);
        })
        .listen("unload", (log, event) => {
          log.info(event.detail);
          log.detach();
        })
        .listen("beforecallguestmethod", (log, event) => {
          log.info(event.detail);
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
      (log, { detail: { failed, loaded, host } }: HostEventLoadAllGuests) => {
        if (failed.length > 0) {
          log.error("%d guests failed to load!", failed.length);
        }

        log.info("%d guests loaded", loaded.length, host);
      },
    )
    .listen("unload", (log) => {
      log.info("Unloaded guest and container.");
      log.detach();
    });
  return hostLogger;
}
