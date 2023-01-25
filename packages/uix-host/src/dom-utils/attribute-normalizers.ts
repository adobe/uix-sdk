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

/**
 * Strings to be used as values in a space-separated HTML attribute.
 * @internal
 */
export type AttrTokens<T> = string | T[];

/**
 * Normalize an argument that may be either a space-separated HTML attribute
 * value or an array of those attribute values into an array of those values.
 * @internal
 */
export const tokenizeAttrValues = <T>(tokens: AttrTokens<T>) =>
  (typeof tokens === "string" ? tokens.split(" ") : tokens) as T[];

/**
 * Merge, deduplicate and typecheck a set of strings for an HTML attribute that
 * requires those values to be space-separated tokens.
 * @internal
 *
 * @remarks
 * Useful as a typed interface for any DOM property that is a DOMTokenList.
 * While the DOMTokenList does its own deduplication, it's slightly slower,
 * and while it may do validation of legal tokens, it only does so at runtime.
 * Using {@link AttrTokens} and this function adds typing and autocomplete.
 *
 *
 * @example
 * ```typescript
 * type AllowedClasses =
 *  | "primary"
 *  | "light"
 *  | "large"
 *  | "quiet";
 *
 * // combine with existing classes and set attribute directly
 * function setStyles(elm: HTMLElement, styles: AttrTokens<AllowedClasses>) {
 *  const classNames = mergeAttrValues(
 *    elm.className as AttrTokens<AllowedClasses>,
 *    styles
 *  );
 *  elm.className = classNames.join(' ');
 * }
 *
 * // use DOM property directly, but now it's typed!
 * function setSandbox(
 *   iframe: HTMLIframeElement,
 *   allowedSandboxes: AttrTokens<"allow-scripts" | "allow-popups">
 * ) {
 *  mergeAttrValues(allowedSandboxes).forEach(val => iframe.sandbox.add(val));
 * }
 * ```
 */
export const mergeAttrValues = <T>(...tokenLists: AttrTokens<T>[]) => {
  const allMerged = new Set<T>();
  for (const tokenList of tokenLists) {
    for (const token of tokenizeAttrValues(tokenList)) {
      allMerged.add(token);
    }
  }
  return [...allMerged];
};
