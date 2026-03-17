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

import type {
  CrossRealmObject,
  UIFrameRect,
  VirtualApi,
} from "@adobe/uix-core";
import {
  type AttrTokens,
  makeSandboxAttrs,
  requiredIframeProps,
  type SandboxToken,
} from "@adobe/uix-host";
import React, {
  type IframeHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { useHost } from "../hooks/useHost.js";

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
   * Host methods to provide only to the guest inside all iframes.
   */
  methods?: VirtualApi;
  /**
   * Host methods to provide only to the guest inside this iframe.
   */
  privateMethods?: VirtualApi;
}

const defaultIFrameProps: FrameProps = {
  height: "100%",
  style: {
    border: "none",
    display: "block",
  },
  width: "100%",
};

const defaultSandbox = "allow-scripts allow-forms allow-same-origin";

/**
 * An iframe that attaches to a running GuestServer, to display visible UI pages
 * delivered by the Extension server.
 * @public
 */
// eslint-disable-next-line max-lines-per-function
export const GuestUIFrame = ({
  guestId,
  src = "",
  onConnect,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDisconnect,
  onConnectionError,
  onResize,
  methods,
  privateMethods,
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

  /* eslint-disable react-hooks/rules-of-hooks, react-hooks/exhaustive-deps -- early return above is pre-existing; fixing requires a larger refactor */
  useEffect(() => {
    if (ref.current) {
      let mounted = true;
      let connection: CrossRealmObject<VirtualApi>;
      const connectionFrame = ref.current;

      if (methods) {
        guest.provide(methods);
      }

      const connecting = guest.attachUI(connectionFrame, privateMethods);

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
              }`,
            );

            Object.assign(frameError, {
              guest,
              host,
              original: error,
              ref,
            });

            if (onConnectionError) {
              onConnectionError(frameError);
            }
          }
        });

      return () => {
        mounted = false;

        if (connection) {
          connection.tunnel.destroy();
        }
      };
    }
  }, [guest.id]);

  useEffect(() => {
    if (ref.current && onResize) {
      const currentFrame = ref.current;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return guest.addEventListener(
        "guestresize",
        ({ detail: { guestPort, iframe, dimensions } }) => {
          if (guestPort.id === guest.id && iframe === currentFrame) {
            onResize(dimensions);
          }
        },
      );
    }
  }, [ref.current, guest.id, onResize]);
  /* eslint-enable react-hooks/rules-of-hooks */

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
