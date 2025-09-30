import { useCallback, useContext, useEffect, useState } from "react";
import { ExtensibleStateProviderContext } from "../components/ExtensibleState/ExtensibleStateProviderContext";

export const useExtensibilityState = (
  key: string,
  defaultState: unknown
): [unknown, (value: unknown) => void] => {
  const { storeManager } = useContext(ExtensibleStateProviderContext);
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    if (storeManager) {
      const current = storeManager.get(key);
      const def = current ?? defaultState;
      storeManager.set(key, def);
      storeManager.subscribe(key, (value: unknown) => {
        setState(value);
      });
      setState(def);
    }
  }, [storeManager]);

  const setExtensibleState = useCallback(
    (value: unknown) => {
      storeManager.set(key, value);
    },
    [storeManager]
  );

  return [state, setExtensibleState];
};
