import type { PropsWithChildren } from "react";
import { AttachContext } from "../attach-context";
import React, { useEffect, useState } from "react";
import { attach, GuestConfigInterface, GuestUI } from "@adobe/uix-guest";
import { ExtensibleStoreManager, VirtualApi } from "@adobe/uix-core";

type AttachType = {
  config: GuestConfigInterface;
};

export const Attach = ({ children, config }: PropsWithChildren<AttachType>) => {
  const [connection, setConnection] = useState(
    undefined as GuestUI<VirtualApi>
  );
  const [storeManager, setStoreManager] = useState(null);

  useEffect(() => {
    setStoreManager(ExtensibleStoreManager.getInstance());
    attach(config).then((guestConnection) => {
      return setConnection(guestConnection);
    });
  }, []);

  return (
    <AttachContext.Provider value={{ connection, storeManager }}>
      {children}
    </AttachContext.Provider>
  );
};
