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

import { asyncThrottle, CrossRealmObject, VirtualApi } from "@adobe/uix-core";
import React, { useEffect, useRef } from "react";
import type { IframeHTMLAttributes } from "react";
import { useHost } from "../hooks/useHost.js";
import type { AttrTokens, SandboxToken } from "@adobe/uix-host";
import { makeSandboxAttrs, requiredIframeProps } from "@adobe/uix-host";

type ReactIframeProps = IframeHTMLAttributes<HTMLIFrameElement>;

type ResizeTiming = "every" | "after";
type ResizeOpt = `${ResizeTiming} ${number}`;
type ResizeOptHeight = `height ${ResizeOpt}`;
type ResizeOptWidth = `width ${ResizeOpt}`;
type ResizeOptString =
  | ResizeOpt
  | ResizeOptHeight
  | ResizeOptWidth
  | `${ResizeOptHeight}, ${ResizeOptWidth}`
  | `${ResizeOptWidth}, ${ResizeOptHeight}`;

type ResizeBehavior = { timing: ResizeTiming; interval: number };
type ResizeBehaviors = {
  height?: ResizeBehavior;
  width?: ResizeBehavior;
};

function parseResizeOpt(optString: ResizeOptString): ResizeBehaviors {
  const [first, second] = optString.split(",");
}

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
  onResize?: (dimensions: DOMRect) => void;
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
  /**
   * Dimensions, timing and rate of automatic resize behavior.
   *
   * @remarks
   * The guest document in an iframe will resize as its contents change, and a
   * GuestUIFrame can automatically resize itself to those dimensions. Resize
   * can happen once, to size to a document after its first load, or it can run
   * repeatedly, as the document resizes itself. Resize events can be copious,
   * so GuestUIFrame throttles them to only once within the provided interval.
   *
   * This is a space-separated string describing resize behavior. The format is
   * `[dimension] <timing> <interval>`.
   *
   * - `<interval>` is a number of milliseconds.
   * - `<timing>` must be either `after` or `every`. If `after`, the resize
   *   happens once, at `<interval>` ms after the guest has loaded. If `every`,
   *   the resize happens every time the guest resizes, at maximum once per
   *   `<interval>` ms.
   * - `[dimension]` is optional; it can apply the behavior to only height, or
   *   only width.
   *
   * To specify different behaviors for height and width, list both behaviors,
   * separated by a comma.
   *
   * @example `"every 500"`
   * @example `"height after 250"`
   * @example `"width after 500, height every 750"`
   *
   */
  autoResize?: ResizeOptString;
  /**
   * Send resize events only every `autoResizeInterval` milliseconds.
   * @default 250
   */
  autoResizeInterval?: number;
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
  autoResize,
  autoResizeInterval = 250,
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
    if (ref.current && (autoResize || onResize)) {
      const currentFrame = ref.current;
      function resizeDimension(dimension: "height" | "width", rect: DOMRect) {
        currentFrame.style[dimension] = String(
          customIFrameProps[dimension] || `${rect[dimension]}px`
        );
      }

      return guest.addEventListener(
        "iframeresize",
        asyncThrottle(({ detail: { guestPort, iframe, dimensions } }) => {
          if (guestPort.id === guest.id && iframe === currentFrame) {
            if (autoResize === true) {
              resizeDimension("height");
              resizeDimension("width");
            } else if (autoResize) {
              resizeDimension(autoResize);
            }
            // setDimensions(resizeEvent.dimensions);
            if (onResize) {
              onResize(dimensions);
            }
          }
        }, autoResizeInterval)
      );
    }
  }, [ref.current, autoResize, guest.id]);

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
