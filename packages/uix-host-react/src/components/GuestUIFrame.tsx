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

import { CrossRealmObject, UIFrameRect, VirtualApi } from "@adobe/uix-core";
import React, { useEffect, useRef } from "react";
import type { IframeHTMLAttributes } from "react";
import { useHost } from "../hooks/useHost.js";
import type { AttrTokens, SandboxToken } from "@adobe/uix-host";
import { makeSandboxAttrs, requiredIframeProps } from "@adobe/uix-host";

/**
 * @internal
 */
type ReactIframeProps = IframeHTMLAttributes<HTMLIFrameElement>;

/**
 * @public
 */
type FrameProps = Omit<ReactIframeProps, "sandbox">;

/** @public */
export interface GuestUIProps extends FrameProps {
  guestId: string;
  /**
   * Receives the Penpal context when the frame is mounted.
   */
  onConnect?: () => void;
  /**
   * Called when the frame disconnects and unmounts.
   */
  onDisconnect?: () => void;
  /**
   * Called when the connection process throws an exception
   */
  onConnectionError?: (error: Error) => void;
  /**
   * Called when the document in the iframe changes size.
   */
  onResize?: (dimensions: UIFrameRect) => void;
  /**
   * Additional sandbox attributes GuestUIFrame might need.
   */
  sandbox?: AttrTokens<SandboxToken>;
  /**
   * Optional custom URL or path.
   */
  src: string;
  /**
   * Host methods to provide only to the guest inside this iframe.
   */
  methods?: VirtualApi;
}

const defaultIFrameProps: FrameProps = {
  width: "100%",
  height: "100%",
  style: {
    border: "none",
  },
};

const defaultSandbox = "allow-scripts allow-forms allow-same-origin";

/**
 * An iframe that attaches to a running GuestServer, to display visible UI pages
 * delivered by the Extension server.
 * @public
 */
export const GuestUIFrame = ({
  guestId,
  src = "",
  onConnect,
  onDisconnect,
  onConnectionError,
  onResize,
  methods,
  sandbox = "",
  style,
  ...customIFrameProps
}: GuestUIProps) => {
  const ref = useRef<HTMLIFrameElement>();
  const { host } = useHost();
  if (!host) {
    return null;
  }
  const guest = host.guests.get(guestId);
  const frameUrl = new URL(src, guest.url.href);

  useEffect(() => {
    if (ref.current) {
      let mounted = true;
      let connection: CrossRealmObject<VirtualApi>;
      const connectionFrame = ref.current;
      if (methods) {
        guest.provide(methods);
      }
      const connecting = guest.attachUI(connectionFrame);
      connecting
        .then((c) => {
          connection = c;
          if (!mounted) {
            c.tunnel.destroy();
          } else if (onConnect) {
            onConnect();
          }
        })
        .catch((error: Error) => {
          if (mounted && !connection && connectionFrame === ref.current) {
            const frameError = new Error(
              `GuestUIFrame connection failed: ${
                (error && error.stack) || error
              }`
            );
            Object.assign(frameError, {
              original: error,
              ref,
              guest,
              host,
            });
            if (onConnectionError) onConnectionError(frameError);
          }
        });
      return () => {
        mounted = false;
        if (connection) {
          connection.tunnel.destroy();
        }
      };
    }
  }, []);

  useEffect(() => {
    if (ref.current && onResize) {
      const currentFrame = ref.current;
      return guest.addEventListener(
        "guestresize",
        ({ detail: { guestPort, iframe, dimensions } }) => {
          if (guestPort.id === guest.id && iframe === currentFrame) {
            onResize(dimensions);
          }
        }
      );
    }
  }, [ref.current, guest.id, onResize]);

  return (
    <iframe
      {...defaultIFrameProps}
      ref={ref}
      src={frameUrl.href}
      name={`uix-guest-${guest.id}`}
      sandbox={
        sandbox
          ? makeSandboxAttrs(defaultSandbox, sandbox).join(" ")
          : defaultSandbox
      }
      style={
        style
          ? { ...style, ...defaultIFrameProps.style }
          : defaultIFrameProps.style
      }
      {...customIFrameProps}
      {...requiredIframeProps}
    />
  );
};
export default GuestUIFrame;
