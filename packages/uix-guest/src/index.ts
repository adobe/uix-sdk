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
 * @packageDocumentation
 * Tools for UI Extensions meant to run inside extensible apps. Connects
 * Extensions running in their own window contexts with the host app, allowing
 * the host and guest to exchange method, events, and signals.
 *
 * @remarks The core object of this library, which extensions use for
 * communication, is the Guest object. There are two variants of the Guest
 * object {@link GuestServer} for the bootstrap frame which your extension keeps
 * running in the background, and {@link GuestUI} for frames meant to be
 * displayed in the host application. An extension must have one GuestServer
 * frame, and the host app may choose to use one or more GuestUI frames.
 *
 * @example Creating and connecting a GuestServer with {@link register}
 * ```typescript
 * import { register } from "@adobe/uix-guest";
 *
 * const server = await register({
 *   // Must match extension ID from registry
 *   id: "My Custom View Extension",
 *   // enable logging in dev build
 *   debug: process.env.NODE_ENV !== "production",
 *   // Host can access these methods from its Port to this guest
 *   methods: {
 *     // Methods must be namespaced by one or more levels
 *     myCustomView: {
 *       async documentIsViewable(docId) {
 *         const doc = await callMyRuntimeAction(docId);
 *         return someValidation(doc);
 *       },
 *       renderView(docId, depth) {
 *         // Use a host method
 *         const tooltip = await server.host.editor.requestTooltip({
 *           type: 'frame',
 *           url: new URL(`/show/${docId}`, location).href
 *         })
 *       }
 *     },
 *   },
 * })
 * ```
 *
 * @example Connecting to an existing GuestServer with a GuestUI
 * ```typescript
 * import { attach } from "@adobe/uix-guest";
 *
 * const ui = await attach({
 *   id: "My Custom View Extension",
 * })
 *
 * // when editing is done:
 * const saved = await ui.host.editor.saveChanges();
 * if (!saved) {
 *   const editorState = ui.sharedContext.get('editorState');
 *   if (editorState.tooltips[ui.id].invalid === true) {
 *     putGuestUIInInvalidState();
 *   }
 * } else {
 *   ui.host.editor.dismissTooltip();
 * }
 * ```
 *
 */
import type { GuestApis, GuestMetadata } from "@adobe/uix-core";
import type { AppConnection, Guest, GuestConfig } from "./guest.js";
import { GuestServer } from "./guest-server.js";
import { GuestUI } from "./guest-ui.js";

export type { AppConnection } from "./guest";
/**
 * {@inheritdoc GuestConfig}
 * @public
 */
type GuestConfigWithMethods<Outgoing extends GuestApis> = GuestConfig & {
  methods: Outgoing;
  metadata?: GuestMetadata;
};

/**
 * Create and immediately return a {@link GuestServer}.
 *
 * @deprecated Use {@link attach} or {@link register}, which return Promises
 * that resolve once the guest is connected.
 * @public
 */
export function createGuest(config: GuestConfig) {
  const guest = new GuestServer(config);

  return guest;
}

/**
 * Connect to a running {@link GuestServer} to share its context and render UI.
 *
 * @remarks Creates a guest object that shares most of the GuestServer API,
 * except it cannot register its own methods. Use `attach()` in an app or
 * document that is meant to render a UI in the host application; it will have
 * access to the sharedContext object shared by the host and GuestServer.
 *
 * @public
 */
export async function attach(config: GuestConfig) {
  const guest = new GuestUI(config);

  await guest._connect();
  return guest;
}

/**
 * Initiate a connection to the host app and its extension points.
 *
 * @remarks Creates the "main" {@link GuestServer}, which runs in the background
 * without UI. Registers methods passed in the `methods` parameter, then
 * resolves the returned Promise with the connected GuestServer object.
 *
 * @public
 */
export async function register<App extends AppConnection>(
  config: GuestConfigWithMethods<App["outgoing"]>,
) {
  const guest = new GuestServer<App>(config);

  guest.register(config.methods, config.metadata);
  return guest;
}

// backwards compatibility
export {
  Guest,
  Guest as BaseGuest,
  GuestUI,
  GuestUI as UIGuest,
  GuestServer,
  GuestServer as PrimaryGuest,
};
