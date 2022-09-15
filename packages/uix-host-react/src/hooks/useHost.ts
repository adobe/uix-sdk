import { useContext } from "react";
import { Host } from "@adobe/uix-host";
import { ExtensionContext } from "../extension-context.js";

export class OutsideOfExtensionContextError extends Error {
  outsideOfExtensionContext: boolean;
  constructor(msg: string) {
    super(msg);
    this.outsideOfExtensionContext = true;
    Object.setPrototypeOf(this, OutsideOfExtensionContextError.prototype);
  }
}

type UseHostResponse =
  | { host: undefined; error: Error }
  | { host: Host; error: undefined };

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
