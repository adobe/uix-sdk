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

import type { VirtualApi } from "@adobe/uix-core";
import React, { useCallback } from "react";
import type { PropsWithChildren, IframeHTMLAttributes } from "react";
import { useHost } from "../hooks/useHost.js";

/**
 * @public
 */
type FrameProps = IframeHTMLAttributes<HTMLIFrameElement>;

/** @public */
export interface GuestUIProps extends FrameProps {
  guestId: string;
  /**
   * Receives the Penpal context when the frame is mounted.
   */
  onConnect: () => unknown;
  /**
   * Called when the frame disconnects and unmounts.
   */
  onDisconnect: () => unknown;
  /**
   * Called when the connection process throws an exception
   */
  onConnectionError?: (error: Error) => void;
  /**
   * Optional custom URL or path.
   */
  src: string;
  /**
   * Host methods to provide only to the guest inside this iframe.
   */
  methods?: VirtualApi;

  /**
   *
   * @defaultValue "100%"
   */
  width: FrameProps["width"];
}

const defaultFrameProps: FrameProps = {
  width: "100%",
  height: "100%",
  sandbox: "allow-scripts",
  style: {
    border: "none",
  },
};

/**
 * An iframe that attaches to a running GuestServer, to display visible UI pages
 * delivered by the Extension server.
 * @public
 */
export function GuestUIFrame({
  guestId,
  src = "",
  onConnect,
  onDisconnect,
  onConnectionError,
  methods,
  ...customFrameProps
}: PropsWithChildren<GuestUIProps>) {
  const { host } = useHost();
  if (!host) {
    return null;
  }
  const guest = host.guests.get(guestId);
  const frameUrl = new URL(src, guest.url.href);

  const ref = useCallback((iframe: HTMLIFrameElement) => {
    if (iframe) {
      if (methods) {
        guest.provide(methods);
      }
      const connection = guest.attachUI(iframe);
      connection.promise
        .then(() => {
          if (onConnect) {
            onConnect();
          }
        })
        .catch((error: Error) => {
          if (onConnectionError) onConnectionError(error);
          else throw error;
        });
      return async () => {
        if (onDisconnect) {
          await onDisconnect();
          return guest.unload();
        }
      };
    }
  }, []);

  const frameProps = { ...defaultFrameProps, ...customFrameProps };

  return (
    <iframe
      ref={ref}
      src={frameUrl.href}
      name={`uix-guest-${guest.id}`}
      {...frameProps}
      sandbox="allow-scripts allow-downloads allow-same-origin allow-presentation"
    />
  );
}
export default GuestUIFrame;
