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

import { HTMLAttributeReferrerPolicy } from "react";
import { AttrTokens, mergeAttrValues } from "./attribute-normalizers";

/**
 * Sandbox permissions that guest iframes are allowed to have.
 * @internal
 */
type SandboxPermission =
  | "downloads"
  | "orientation-lock"
  | "pointer-lock"
  | "popups"
  | "presentation"
  | "same-origin"
  | "scripts"
  | "storage-access-by-user-activation"
  | "top-navigation-by-user-activation";

/**
 * Character strings allowed in "sandbox=" attribute.
 * @internal
 */
export type SandboxToken = `allow-${SandboxPermission}`;

/**
 * Merge lists of attrs together
 * @internal
 */
export const makeSandboxAttrs = (...sandboxes: AttrTokens<SandboxToken>[]) =>
  mergeAttrValues<SandboxToken>(...sandboxes);

/**
 * Permissions Policy directives for an iframe "allow=" attribute. Either a
 * semicolon-separated string (e.g. `"microphone; autoplay 'self'"`) or an
 * array of individual directives (e.g. `["microphone", "autoplay 'self'"]`).
 * @public
 */
export type AllowDirectives = string | string[];

const tokenizeAllowDirectives = (directives: AllowDirectives) =>
  (typeof directives === "string" ? directives.split(";") : directives)
    .map((directive) => directive.trim().replace(/\s+/g, " "))
    .filter(Boolean);

/**
 * Merge and deduplicate Permissions Policy directives for an iframe "allow="
 * attribute. Directives are keyed by feature name; when the same feature
 * appears more than once, the first occurrence wins.
 * @internal
 */
export const makeAllowAttrs = (...allowLists: AllowDirectives[]) => {
  const byFeature = new Map<string, string>();
  for (const allowList of allowLists) {
    for (const directive of tokenizeAllowDirectives(allowList)) {
      const feature = directive.split(" ")[0].toLowerCase();
      if (!byFeature.has(feature)) {
        byFeature.set(feature, directive);
      }
    }
  }
  return [...byFeature.values()];
};

/**
 * Limit provided set of "sandbox" attributes to a list of legal ones.
 * @internal
 */
export const requiredIframeProps = {
  // must not require this until app builder supports CSP
  // csp: "frame-ancestors 'self'",
  "data-uix-guest": "true",
  role: "presentation",
  referrerPolicy: "strict-origin" as HTMLAttributeReferrerPolicy,
  // Without this, Chrome's Local Network Access checks silently block guest
  // iframe requests to hosts that resolve to a private/CGNAT IP (e.g. behind
  // some corporate proxies), with no permission prompt shown.
  allow: "local-network-access",
};

const { allow: requiredAllow, ...requiredIframeAttrs } = requiredIframeProps;
const requiredIframeAttrEntries = Object.entries(requiredIframeAttrs);

/**
 * Set and/or verify the required properties for use with uix-sdk on an iframe.
 * Required "allow=" directives are merged into any existing ones rather than
 * replacing them, so host-granted permissions are preserved.
 * @internal
 */
export const normalizeIframe = (iframe: HTMLIFrameElement) => {
  for (const [attr, value] of requiredIframeAttrEntries) {
    iframe.setAttribute(attr, value);
  }
  iframe.setAttribute(
    "allow",
    makeAllowAttrs(requiredAllow, iframe.getAttribute("allow") || "").join("; ")
  );
};
