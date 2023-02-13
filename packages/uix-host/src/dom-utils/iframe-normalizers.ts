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
 * Limit provided set of "sandbox" attributes to a list of legal ones.
 * @internal
 */
export const requiredIframeProps = {
  // must not require this until app builder supports CSP
  // csp: "frame-ancestors 'self'",
  "data-uix-guest": "true",
  role: "presentation",
  referrerPolicy: "strict-origin" as HTMLAttributeReferrerPolicy,
};

const requiredIframeAttrEntries = Object.entries(requiredIframeProps);

/**
 * Set and/or verify the required properties for use with uix-sdk on an iframe.
 * @internal
 */
export const normalizeIframe = (iframe: HTMLIFrameElement) => {
  for (const [attr, value] of requiredIframeAttrEntries) {
    iframe.setAttribute(attr, value);
  }
};
