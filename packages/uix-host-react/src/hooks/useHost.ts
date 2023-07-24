/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { useContext } from "react";
import { Host } from "@adobe/uix-host";
import {
  ExtensionContext,
  ExtensibilityContext,
} from "../extension-context.js";

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
  const extensionsInfo = useContext<ExtensibilityContext>(ExtensionContext);

  if (!(extensionsInfo.host instanceof Host)) {
    const error = new OutsideOfExtensionContextError(
      "Attempt to use extensions outside of ExtensionContext. Wrap extensible part of application with Extensible component."
    );
    return {
      host: undefined,
      error,
    };
  }
  return { error: undefined, host: extensionsInfo.host };
}
