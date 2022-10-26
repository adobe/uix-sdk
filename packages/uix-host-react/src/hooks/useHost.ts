import { useContext } from "react";
import { Host } from "@adobe/uix-host";
import { ExtensionContext } from "../extension-context.js";

/**
 * @public
 */
export class OutsideOfExtensionContextError extends Error {
  outsideOfExtensionContext: boolean;
  constructor(msg: string) {
    super(msg);
    this.outsideOfExtensionContext = true;
    Object.setPrototypeOf(this, OutsideOfExtensionContextError.prototype);
  }
}

/** @public */
type UseHostResponse =
  | { host: undefined; error: Error }
  | { host: Host; error: undefined };

/**
 * Retrieve the {@link @adobe/uix-host#Host} object hosting all extensions inside the current parent provider.
 *
 * @remarks Returns a `{ host, error }` tuple, not the host object directly.
 * @beta
 */
export function useHost(): UseHostResponse {
  const host = useContext(ExtensionContext);
  if (!(host instanceof Host)) {
    const error = new OutsideOfExtensionContextError(
      "Attempt to use extensions outside of ExtensionContext. Wrap extensible part of application with Extensible component."
    );
    return {
      host: undefined,
      error,
    };
  }
  return { error: undefined, host };
}
