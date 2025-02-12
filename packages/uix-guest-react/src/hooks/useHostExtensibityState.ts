import { useExtensibilityState } from "./useExtensibilityState";

export const useHostExtensibilityState = (
  key: string,
  defaultState: unknown
): [unknown, (value: unknown) => void] => {
  return useExtensibilityState(key, defaultState, "default");
};
