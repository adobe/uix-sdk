import React, { useEffect, useState } from "react";
import { ExtensibleStateApiProvider } from "./ExtensibleStateApiProvider";
import { ExtensibleStateBroadcaster } from "./ExtensibleStateBroadcaster";
import { ExtensibleStateProviderContext } from "./ExtensibleStateProviderContext";
import { ExtensibleStoreManager } from "@adobe/uix-core";
import type { PropsWithChildren } from "react";

export const ExtensibleStateProvider = ({
  children,
}: PropsWithChildren<unknown>) => {
  const [storeManager, setStoreManager] = useState(null);

  useEffect(() => {
    setStoreManager(ExtensibleStoreManager.getInstance());
  }, []);

  return (
    <ExtensibleStateProviderContext.Provider value={{ storeManager }}>
      <ExtensibleStateApiProvider />
      <ExtensibleStateBroadcaster />
      {children}
    </ExtensibleStateProviderContext.Provider>
  );
};
