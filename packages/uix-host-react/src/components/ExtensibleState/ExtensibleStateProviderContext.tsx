import { createContext } from "react";
import type { ExtensibleStoreManagerInterface } from "@adobe/uix-core";

export type ExtensibleStateProviderContextType = {
  storeManager: ExtensibleStoreManagerInterface;
};

export const ExtensibleStateProviderContext =
  createContext<ExtensibleStateProviderContextType>(
    {} as ExtensibleStateProviderContextType
  );
