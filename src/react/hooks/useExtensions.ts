import { useCallback, useContext, useMemo } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import type { NamespacedApis, RequiredMethodsByName } from "../../common/types";
import { GuestConnector } from "../../host";
import { ExtensionContext } from "../extension-context";

export interface TypedGuestConnection<T extends NamespacedApis> {
  id: GuestConnector["id"];
  apis: T;
}

export interface UseExtensionsConfig<
  Incoming extends NamespacedApis,
  Outgoing extends NamespacedApis
> {
  requires?: RequiredMethodsByName<Incoming>;
  provides?: Outgoing;
}

export interface UseExtensionsResult<T extends NamespacedApis> {
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
  const guests = useSyncExternalStore(
    host.onLoadGuest,
    useCallback(() => host.getLoadedGuests(requires), [host])
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
// const { extensions } = useExtensions<{
//   autocomplete: { onTextToken: (text: string) => Promise<string[]> };
// }>({
//   withCapabilities: {
//     autocomplete: ["onTextToken"],
//   },
// });

// extensions.extensionId.autocomplete.onTextToken("askldj");
