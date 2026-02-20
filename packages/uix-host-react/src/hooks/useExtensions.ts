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

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  GuestApis,
  GuestConnection,
  RemoteGuestApis,
  VirtualApi,
} from "@adobe/uix-core";
import type {
  CapabilitySpec,
  ExtensionRegistryEndpointRegistration,
  Host,
  HostEvents,
  Port,
} from "@adobe/uix-host";
import { ExtensibleComponentBoundaryContext } from "../components/ExtensibleComponentBoundary";
import { useHost } from "./useHost";

/**
 * @internal
 */
export interface TypedGuestConnection<
  T extends GuestApis,
> extends GuestConnection {
  id: GuestConnection["id"];
  apis: RemoteGuestApis<T>;
}

/** @public */
export interface UseExtensionsConfig<
  Incoming extends GuestApis,
  Outgoing extends VirtualApi,
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
const noop: () => void = () => undefined;

const createUnloadHandler =
  (
    setExtensions: Dispatch<SetStateAction<TypedGuestConnection<GuestApis>[]>>,
  ) =>
  (e: CustomEvent<{ guest: Port<GuestApis> }>) => {
    const { guest } = e.detail;

    if (guest && guest.id) {
      setExtensions((prevExtensions) => {
        const filtered = prevExtensions.filter(
          (ext) => ext.id !== guest.id || ext.url !== guest.url,
        );

        return filtered.length === 0 ? NO_EXTENSIONS : filtered;
      });
    }
  };

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
export const useExtensions = <
  Incoming extends GuestApis,
  Outgoing extends VirtualApi,
>(
  configFactory: (host: Host) => UseExtensionsConfig<Incoming, Outgoing>,
  deps: unknown[] = [],
): UseExtensionsResult<Incoming> => {
  const { host, error: hostContextError } = useHost();
  const [hostError, setHostError] = useState<Error>();
  const extensionPoints = useContext(ExtensibleComponentBoundaryContext);
  const boundaryExtensionPointsAsString = useMemo(
    () =>
      extensionPoints?.map(
        ({
          service,
          extensionPoint,
          version,
        }: ExtensionRegistryEndpointRegistration) =>
          `${service}/${extensionPoint}/${version}`,
      ),
    [extensionPoints],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const depsKey = useMemo(() => JSON.stringify(deps), deps);

  const config = useMemo(() => {
    if (!host) {
      return { updateOn: "each" as const };
    }

    return configFactory(host);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, configFactory, depsKey]);

  const { requires, provides, updateOn = "each" } = config;

  const getExtensions = useCallback(() => {
    if (!host) {
      return NO_EXTENSIONS;
    }

    const newExtensions: TypedGuestConnection<Incoming>[] = [];
    const guests = host.getLoadedGuests(requires);

    for (const guest of guests) {
      const allExtensionPoints: string[] =
        getAllExtensionPointsFromGuest(guest);

      if (
        !boundaryExtensionPointsAsString ||
        !allExtensionPoints.length ||
        isGuestExtensionPointInBoundary(
          boundaryExtensionPointsAsString,
          allExtensionPoints,
        )
      ) {
        newExtensions.push(guest as unknown as TypedGuestConnection<Incoming>);
      }
    }

    return newExtensions.length === 0 ? NO_EXTENSIONS : newExtensions;
  }, [host, requires, boundaryExtensionPointsAsString]);

  const subscribe = useCallback(
    (handler: EventListener) => {
      if (!host) {
        return noop;
      }

      const eventName = updateOn === "all" ? "loadallguests" : "guestload";

      host.addEventListener(eventName, handler);

      return () => {
        host.removeEventListener(eventName, handler);
      };
    },
    [host, updateOn],
  );

  const subscribeToUnload = useCallback(
    (handler: EventListener) => {
      if (!host) {
        return noop;
      }

      host.addEventListener("guestunload" as HostEvents["type"], handler);

      return () => {
        host.removeEventListener("guestunload" as HostEvents["type"], handler);
      };
    },
    [host],
  );

  const [extensions, setExtensions] = useState(() => getExtensions());

  useEffect(
    () => subscribe(() => setExtensions(getExtensions())),
    [subscribe, getExtensions],
  );

  useEffect(() => {
    const handleGuestUnload = createUnloadHandler(setExtensions);

    return subscribeToUnload(handleGuestUnload as EventListener);
  }, [subscribeToUnload]);

  useEffect(() => {
    for (const guest of extensions) {
      if (provides) {
        guest.provide(provides);
      }
    }
  }, [provides, extensions]);

  useEffect(() => {
    if (!host) {
      return;
    }

    return host.addEventListener(
      "error",
      (event: Extract<HostEvents, { detail: { error: Error } }>) =>
        setHostError(event.detail.error),
    );
  }, [host]);

  if (hostContextError) {
    return {
      error: hostContextError,
      extensions: NO_EXTENSIONS,
      loading: false,
    };
  }

  return {
    error: hostError,
    extensions,
    loading: extensions.length === 0 ? false : !!host?.loading,
  };
};

/**
 * Each extension/guest can have
 *    1. `extensioPoints` field as an array of strings
 *    2. Metadata with array of extensionPoints. If the metadata is present, we need to use it for fitering the extensions.
 * Returns cumulative extension points.
 * @param guest
 * @returns array of extension points as strings
 */
const getAllExtensionPointsFromGuest = (guest: Port<GuestApis>): string[] => {
  try {
    const extensions = guest.metadata?.extensions as
      | { extensionPoint: string }[]
      | undefined;
    const guestExtensionPointsFromMetadata = extensions?.map(
      (extension) => extension?.extensionPoint,
    );
    const allExtensionPoints = [
      ...(guest.extensionPoints || []),
      ...(guestExtensionPointsFromMetadata || []),
    ];

    return allExtensionPoints;
  } catch {
    console.error(
      "Error occurred while getting extension points from guest and metadata. Extension boundaries will not be effective.",
    );
    return [];
  }
};

const isGuestExtensionPointInBoundary = (
  boundaryExtensionPointsAsString: string[],
  guestExtensionPoints: string[],
) =>
  boundaryExtensionPointsAsString?.length &&
  guestExtensionPoints?.length &&
  guestExtensionPoints.some((extensionPoint) =>
    boundaryExtensionPointsAsString.includes(extensionPoint),
  );
