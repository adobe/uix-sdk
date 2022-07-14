import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import type { NamespacedApis, RequiredMethodsByName } from "../../common/types";
import type { GuestConnector, Host } from "../../host";
import { ExtensionContext } from "../extension-context";

interface TypedGuestConnection<T extends NamespacedApis> {
  id: GuestConnector["id"];
  apis: T;
}

interface UseExtensionsConfig<
  Incoming extends NamespacedApis,
  Outgoing extends NamespacedApis
> {
  requires?: RequiredMethodsByName<Incoming>;
  provides?: Outgoing;
  updateOn?: "each" | "all";
}

interface UseExtensionsResult<T extends NamespacedApis> {
  extensions: TypedGuestConnection<T>[];
  loading: boolean;
  error?: Error;
}

export function useExtensions<
  Incoming extends NamespacedApis,
  Outgoing extends NamespacedApis = NamespacedApis
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
  const subscribe = useCallback(
    (handler) => {
      const eventName = updateOn === "all" ? "loadallguests" : "guestload";
      host.addEventListener(eventName, handler);
      return () => host.removeEventListener(eventName, handler);
    },
    [...baseDeps, updateOn]
  );
  const getSnapshot = useCallback(
    () => host.getLoadedGuests(requires),
    [...baseDeps, requires]
  );
  const guests = useSyncExternalStore(subscribe, getSnapshot);
  const extensions = [];
  for (const guest of guests) {
    if (provides) {
      guest.provide(provides);
    }
    extensions.push(guest as unknown as TypedGuestConnection<Incoming>);
  }
  const [error, setError] = useState<Error>();
  useEffect(
    () =>
      host.addEventListener("guesterror", (event) =>
        setError(event.detail.error)
      ),
    [host]
  );
  return { extensions, loading: !host.isLoading, error };
}
