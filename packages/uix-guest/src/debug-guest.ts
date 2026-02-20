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
 * Adapter to attach console logging listeners to a Guest running in a frame/
 * @internal @preapproved
 */
import type { Emits, EmitterDebugLogger } from "@adobe/uix-core";
import { debugEmitter } from "@adobe/uix-core";
import type { GuestEvents } from "./guest";

export function debugGuest(guest: Emits<GuestEvents>): EmitterDebugLogger {
  return debugEmitter(guest, {
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
        error,
      );
    });
}
