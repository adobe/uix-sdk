import { useContext, useMemo } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import type { NamespacedApis, RequiredMethodsByName } from "../../common/types";
import { GuestConnector } from "../../host";
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
}

interface UseExtensionsResult<T extends NamespacedApis> {
  extensions: TypedGuestConnection<T>[];
}

export function useExtensions<
  Incoming extends NamespacedApis,
  Outgoing extends NamespacedApis = NamespacedApis
>(
  configFactory: () => UseExtensionsConfig<Incoming, Outgoing>,
  deps: any[] = []
): UseExtensionsResult<Incoming> {
  const host = useContext(ExtensionContext);
  const { requires, provides } = useMemo(configFactory, [host, ...deps]);
  const guests = useSyncExternalStore(host.onLoadGuest, () =>
    host.getLoadedGuests(requires)
  );
  return useMemo(() => {
    const extensions = [];
    for (const guest of guests) {
      if (provides) {
        guest.provide(provides);
      }
      extensions.push(guest as unknown as TypedGuestConnection<Incoming>);
    }
    return { extensions };
  }, [guests]);
}
