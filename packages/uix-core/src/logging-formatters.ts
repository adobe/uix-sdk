/**
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import type { HostMethodAddress } from "./types";
import { isFunction, isIterable, isPrimitive } from "./value-assertions";

/**
 * Try and format any type of value for logging.
 *
 * @privateRemarks
 * **WARNING**: This is an expensive operation due to the JSON.stringify, and
 * should only be done when debugging or in error conditions.
 * @internal
 */
export function formatHostMethodArgument(argument: unknown): string {
  try {
    return JSON.stringify(argument, null, 2);
  } catch (e) {
    if (isIterable(argument)) {
      return `Iterable<${argument.length}>`;
    }
    if (isPrimitive(argument) || isFunction(argument)) {
      return `${argument}`;
    }
    return Object.prototype.toString.call(argument);
  }
}

/**
 * Try and format a remote method call as it would appear during debugging.
 *
 * @privateRemarks
 * **WARNING**: This is an expensive operation due to the JSON.stringify, and
 * should only be done when debugging or in error conditions.  This Functions
 * like {@link @adobe/uix-core#timedPromise} which take logging strings also
 * take callbacks for lazy evaluation of debugging messages. Use this only in
 * such callbacks.
 * @internal
 */
export function formatHostMethodAddress(address: HostMethodAddress) {
  const path =
    address.path?.length < 1
      ? "<Missing method path!>"
      : address.path.join(".");
  const name = address.name || "<Missing method name!>";
  const args = address.args?.map(formatHostMethodArgument).join(",");
  return `host.${path}.${name}(${args})`;
}
