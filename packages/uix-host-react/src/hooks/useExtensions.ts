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

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  GuestConnection,
  GuestApis,
  RemoteGuestApis,
  RemoteGuestApiNS,
  VirtualApi,
} from "@adobe/uix-core";

import { Host, HostEvents } from "@adobe/uix-host";
import type { CapabilitySpec, Port } from "@adobe/uix-host";
import { useHost } from "./useHost";
import { ExtensibleComponentBoundaryContext } from "../components/ExtensibleComponentBoundary";
import { ExtensionRegistryEndpointRegistration } from "@adobe/uix-host";

/**
 * @internal
 */
export interface TypedGuestConnection<T extends GuestApis>
  extends GuestConnection {
  id: GuestConnection["id"];
  apis: RemoteGuestApis<T>;
}

/** @public */
export interface UseExtensionsConfig<
  Incoming extends GuestApis,
  Outgoing extends VirtualApi
> {
  /**
   * A {@link @adobe/uix-host#CapabilitySpec} describing the namespaced methods
   * extensions must implement to be used by this component.
   *
   * @remarks
   * This declaration is used to filter the extensions that will be
   * returned; if they don't implement those methods, they will be filtered out.
   */
  requires?: CapabilitySpec<Required<Incoming>>;
  /**
   * A namespaced object of methods which extensions will be able to call.
   *
   * @remarks This is the counterpart of `requires`; in `requires`, the you
   * describes methods the extension must implement that your host code will
   * call, and in `provides`, you implement host methods that extensions will be
   * able to call.
   *
   * Most cases for host-side methods will use the state of the component. This
   * can cause unexpected bugs in React if the config callback is run on every
   * render. **useExtensions caches the config callback by default!**
   * So remember to pass a deps array, so that the config callback re-runs under
   * the right conditions.
   */
  provides?: Outgoing;
  /**
   * Sets when re-render is triggered on extension load.
   *
   * @remarks
   * Set to `each` to trigger a component re-render every time an individual
   * extension loads, which may result in multiple UI updates. Set to `all` to
   * wait until all extensions have loaded to re-render the component.
   * @defaultValue "each"
   */
  updateOn?: "each" | "all";
}

/** @public */
export interface UseExtensionsResult<T extends GuestApis> {
  /**
   * A list of loaded guests which implement the methods specified in
   * `requires`, represented as {@link @adobe/uix-host#Port} objects which
   * present methods to be called.
   */
  extensions: TypedGuestConnection<T>[];
  /**
   * This is `true` until all extensions are loaded. Use for rendering spinners
   * or other intermediate UI.
   */
  loading: boolean;
  /**
   * Populated with an Error if there were any problems during the load process.
   */
  error?: Error;
}

const NO_EXTENSIONS: [] = [];

/**
 * Fetch extensions which implement an API, provide them methods, and use them.
 *
 * @remarks `useExtensions` does three things at once:
 *  - Gets all extensions which implement the APIs described in the `require` field
 *  - Exposes any functions defined in the `provide` field to those extensions
 *  - Returns an object whose `extensions` property is a list of `Port` objects representing those extensions
 *
 * useExtensions will trigger a re-render when extensions load. You can choose whether it triggers that rerender as each extension loads, or only after all extensions have loaded.
 * @public
 */
export function useExtensions<
  Incoming extends GuestApis,
  Outgoing extends VirtualApi
>(
  configFactory: (host: Host) => UseExtensionsConfig<Incoming, Outgoing>,
  deps: unknown[] = []
): UseExtensionsResult<Incoming> {
  const { host, error } = useHost();
  if (error) {
    return {
      extensions: NO_EXTENSIONS,
      loading: false,
      error,
    };
  }

  const extensionPoints = useContext(ExtensibleComponentBoundaryContext);
  const boundryExtensionPointsAsString = extensionPoints?.map(
    ({
      service,
      extensionPoint,
      version,
    }: ExtensionRegistryEndpointRegistration) =>
      `${service}/${extensionPoint}/${version}`
  );

  const baseDeps = [host, ...deps];
  const {
    requires,
    provides,
    updateOn = "each",
  } = useMemo(() => configFactory(host), baseDeps);

  const getExtensions = useCallback(() => {
    const newExtensions = [];
    const guests = host.getLoadedGuests(requires);

    // Extension filtering: If the boundary is provided, only return extensions which have extensionPoint
    // specified in a provided boundry. Otherwise no filtering is done.
    for (const guest of guests) {
      const allExtensionPoints: string[] =
        getAllExtensionPointsFromGuest(guest);

      if (
        !boundryExtensionPointsAsString ||
        !allExtensionPoints.length ||
        isGuestExtensionPointInBoundary(
          boundryExtensionPointsAsString,
          allExtensionPoints
        )
      ) {
        newExtensions.push(guest as unknown as TypedGuestConnection<Incoming>);
      }
    }
    return newExtensions.length === 0 ? NO_EXTENSIONS : newExtensions;
  }, [...baseDeps, requires]);

  const subscribe = useCallback(
    (handler: EventListener) => {
      const eventName = updateOn === "all" ? "loadallguests" : "guestload";
      host.addEventListener(eventName, handler);
      return () => host.removeEventListener(eventName, handler);
    },
    [...baseDeps, updateOn]
  );

  const [extensions, setExtensions] = useState(() => getExtensions());

  useEffect(() => {
    for (const guest of extensions) {
      if (provides) {
        guest.provide(provides);
      }
    }
  }, [provides, extensions]);

  useEffect(() => {
    return subscribe(() => {
      setExtensions(getExtensions());
    });
  }, [subscribe, getExtensions]);

  const [hostError, setHostError] = useState<Error>();
  useEffect(
    () =>
      host.addEventListener(
        "error",
        (event: Extract<HostEvents, { detail: { error: Error } }>) =>
          setHostError(event.detail.error)
      ),
    baseDeps
  );

  return {
    extensions,
    loading: extensions.length === 0 ? false : host.loading,
    error: hostError,
  };
}

/**
 * Each extension/guest can have
 *    1. `extensioPoints` field as an array of strings
 *    2. Metadata with array of extensionPoints. If the metadata is present, we need to use it for fitering the extensions.
 * Returns cumulative extension points.
 * @param guest
 * @returns array of extension points as strings
 */
function getAllExtensionPointsFromGuest(guest: Port<GuestApis>): string[] {
  try {
    const guestExtensionPointsFromMetadata = guest.metadata?.extensions?.map(
      (extension: { extensionPoint: string }) => extension?.extensionPoint
    );
    const allExtensionPoints = [
      ...(guest.extensionPoints || []),
      ...(guestExtensionPointsFromMetadata || []),
    ];
    return allExtensionPoints;
  } catch {
    console.error(
      "Error occurred while getting extension points from guest and metadata. Extension boundaries will not be effective."
    );
    return [];
  }
}

function isGuestExtensionPointInBoundary(
  boundryExtensionPointsAsString: string[],
  guestExtensionPoints: string[]
) {
  return (
    boundryExtensionPointsAsString?.length &&
    guestExtensionPoints?.length &&
    guestExtensionPoints.some((extensionPoint) =>
      boundryExtensionPointsAsString.includes(extensionPoint)
    )
  );
}
