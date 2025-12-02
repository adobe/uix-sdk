import type { FC } from "react";
import { useExtensions } from "../../hooks";
import { useContext } from "react";
import { ExtensibleStateProviderContext } from "./ExtensibleStateProviderContext";

type CallerType = {
  id: string;
  url: URL;
};

export const ExtensibleStateApiProvider: FC = () => {
  const extensibleStateProviderContext = useContext(
    ExtensibleStateProviderContext
  );
  useExtensions(() => ({
    updateOn: "all",
    provides: {
      storeManager: {
        getValue(_: CallerType, key: string, scope?: string): unknown {
          return extensibleStateProviderContext.storeManager.get(key, scope);
        },
        setValue(
          _: CallerType,
          key: string,
          value: unknown,
          scope?: string
        ): void {
          extensibleStateProviderContext.storeManager.set(key, value, scope);
        },
      },
    },
  }));

  return null;
};
