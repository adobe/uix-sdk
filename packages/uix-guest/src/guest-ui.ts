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

import type { RemoteHostApis, VirtualApi } from "@adobe/uix-core";
import {
  Guest,
  GuestConfig,
  GuestEventBeforeConnect,
  GuestEventConnected,
  GuestEventContextChange,
  GuestEventError,
} from "./guest";

/**
 * A Guest to be used in an extension-controlled frame, usually to display UI.
 *
 * @typeParam Incoming - Optional interface of host methods. If using
 * TypeScript, supply this type parameter and a promisified version of the
 * interface will be available at {@link Guest.host}
 *
 * @remarks
 * This is the object returned when calling {@link @adobe/uix-guest#attach}. It
 * represents an additional frame or runtime created by the host application, on
 * behalf of the extension's control frame which is running the {@link
 * GuestServer}. It is a "secondary" guest object, which a host won't use before
 * the control frame has connected. It exposes a subset of the functionality of
 * the {@link GuestServer}.
 *
 * Unlike the {@link GuestServer}, it cannot register methods or update the
 * {@link Guest.sharedContext}, but it remains in sync with the GuestServer and
 * can access the {@link Guest.sharedContext} of the control frame, as well as
 * any of the published methods on the host.
 *
 * Extensible host apps using the React bindings will likely render GuestUI
 * frames using the {@link @adobe/uix-host-react#GuestUIFrame} component.
 *
 * @example
 * When an extensible app renders this page, {@link @adobe/uix-guest#attach}
 * creates a GuestUI. Once it attaches to the host, it
 * ```javascript
 * import React, { useEffect, useState } from "react";
 * import { attach } from "@adobe/uix-guest";
 * import { Tooltip } from "./tooltip";
 *
 * export default function PopupOverlay(props) {
 *   // how large am I?
 *   const [dimensions, setDimensions] = useState(
 *     document.body.getBoundingClientRect()
 *   );
 *   // if possible, use language preloaded in query parameters
 *   const [language, setLanguage] = useState(props.params.lang)
 *
 *   // attach only once, in a useEffect
 *   useEffect(() => {
 *     attach({
 *       id: "my-extension-id",
 *       debug: true,
 *     })
 *     .then(guestUI => {
 *       // this event fires whenever the host, or the control frame, changes
 *       // any sharedContext value
 *       guestUI.addEventListener("contextchange", ({ detail: { context }}) => {
 *         setLanguage(context.lang)
 *       });
 *       // how large does the host want me to be?
 *       return guestUI.host.tooltips.getDimensions()
 *     .then(setDimensions)
 *     })
 *     .catch((e) => {
 *       console.error("ui attach failed", e);
 *     });
 *   }, []);
 *   // render UI! Due to the setup and useState, this component will re-render
 *   // once attach() is complete.
 *   return (
 *     <Tooltip {...props.params} lang={language} dimensions={dimensions} />
 *   );
 * }
 * ```
 *
 * @public
 */
export class GuestUI<IHost extends VirtualApi> extends Guest<IHost> {
  /**
   * {@inheritDoc Guest."constructor"}
   */
  constructor(config: GuestConfig) {
    super(config);
  }
  /**
   * {@inheritDoc Guest.contextchange}
   * @eventProperty
   */
  public contextchange: GuestEventContextChange;
  /**
   * {@inheritDoc Guest.beforeconnect}
   * @eventProperty
   */
  public beforeconnect: GuestEventBeforeConnect;
  /**
   * {@inheritDoc Guest.connected}
   * @eventProperty
   */
  public connected: GuestEventConnected;
  /**
   * {@inheritDoc Guest.error}
   * @eventProperty
   */
  public error: GuestEventError;
  /**
   * {@inheritDoc Guest.host}
   */
  host: RemoteHostApis<IHost>;
}
