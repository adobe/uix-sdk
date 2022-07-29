import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  GuestConnection,
  RemoteApis,
  RequiredMethodsByName,
} from "@adobe/uix-core";
import type { Host } from "@adobe/uix-host";
import { ExtensionContext } from "../extension-context.js";

interface TypedGuestConnection<T extends RemoteApis> extends GuestConnection {
  id: GuestConnection["id"];
  apis: T;
}

/** @public */
export interface UseExtensionsConfig<
  Incoming extends RemoteApis,
  Outgoing extends RemoteApis
> {
  requires?: RequiredMethodsByName<Incoming>;
  provides?: Outgoing;
  updateOn?: "each" | "all";
}

/** @public */
export interface UseExtensionsResult<T extends RemoteApis> {
  extensions: TypedGuestConnection<T>[];
  loading: boolean;
  error?: Error;
}

/**
 * TODO: document useExtensions
 * @public
 * @typeParam Incoming - Type of the methods object guests should send.
 * @typeParam Outgoing - Type of the methods object send to the guest.
 * @param configFactory - Function that returns a config object. Passing in a config object directly is not supported.
 * @param deps - Any additional dependencies to break cache
 */
export function useExtensions<
  Incoming extends RemoteApis,
  Outgoing extends RemoteApis = RemoteApis
>(
  configFactory: (host: Host) => UseExtensionsConfig<Incoming, Outgoing>,
  deps: unknown[] = []
): UseExtensionsResult<Incoming> {
  const host = useContext(ExtensionContext);
  const baseDeps = [host, ...deps];
  const {
    requires,
    provides,
    updateOn = "each",
  } = useMemo(() => configFactory(host), baseDeps);

  const getExtensions = useCallback(() => {
    const newExtensions = [];
    const guests = host.getLoadedGuests(requires);
    for (const guest of guests) {
      if (provides) {
        guest.provide(provides);
      }
      newExtensions.push(guest as unknown as TypedGuestConnection<Incoming>);
    }
    return newExtensions;
  }, [...baseDeps, requires]);

  const subscribe = useCallback(
    (handler) => {
      const eventName = updateOn === "all" ? "loadallguests" : "guestload";
      host.addEventListener(eventName, handler as EventListener);
      return () =>
        host.removeEventListener(eventName, handler as EventListener);
    },
    [...baseDeps, updateOn]
  );

  const [extensions, setExtensions] = useState(() => getExtensions());
  useEffect(() => {
    return subscribe(() => {
      setExtensions(getExtensions());
    });
  }, [subscribe, getExtensions]);

  const [error, setError] = useState<Error>();
  useEffect(
    () =>
      host.addEventListener("error", (event) => setError(event.detail.error)),
    baseDeps
  );

  return { extensions, loading: !host.loading, error };
}
