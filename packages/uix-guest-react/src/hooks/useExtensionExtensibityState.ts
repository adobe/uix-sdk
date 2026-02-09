import { useExtensibilityState } from "./useExtensibilityState";

export const useExtensionExtensibityState = (
  key: string,
  defaultState: unknown
): [unknown, (value: unknown) => void] => {
  return useExtensibilityState(key, defaultState, "extensions");
};
