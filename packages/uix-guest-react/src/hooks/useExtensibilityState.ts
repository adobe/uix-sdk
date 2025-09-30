import { useEffect, useState, useContext, useCallback } from "react";
import { AttachContext } from "../attach-context";

type RemoteStoreManagerType = {
  getValue(key: string, scope?: string): Promise<unknown>;
  setValue(key: string, value: unknown, scope?: string): void;
};

export const useExtensibilityState = (
  key: string,
  defaultState: unknown,
  scope: string
): [unknown, (value: unknown) => void] => {
  const [state, setState] = useState(defaultState);
  const { connection, storeManager } = useContext(AttachContext);

  useEffect(() => {
    void (async () => {
      if (connection) {
        storeManager.subscribe(key, setState, scope);
        const hostStoreManager = connection.host
          ?.storeManager as RemoteStoreManagerType;
        const value =
          (await hostStoreManager.getValue(key, scope)) || defaultState;
        setState(value);
      }
    })();
  }, [connection]);

  const setRemoteState = useCallback(
    (value: unknown) => {
      const hostStoreManager = connection.host
        ?.storeManager as RemoteStoreManagerType;
      hostStoreManager.setValue(key, value, scope);
    },
    [connection]
  );

  return [state, setRemoteState];
};
