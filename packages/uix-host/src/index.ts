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

/**
 * @packageDocumentation
 * Tools for a web app to become a UI Extensibility Host. Use this library to
 * create a {@link Host} object, which is your interface to declare extension
 * points, instantiate {@link @adobe/uix-guest#GuestServer} objects, connect to
 * them and communicate with them.
 *
 * @remarks
 * A Host is an EventEmitter with a simple query interface. Provide it with a
 * list of extensions from a registry (it will not fetch one itself) and it will
 * load them, receive their registration calls, and make them available for
 * retrieval and use by the extensible app.
 *
 * The Host objects are low-level objects; they are unopinionated with
 * regards to event and lifecycle handling. For use in structured UI frameworks,
 * it will be best to use binding libraries which use these underlying objects.
 *
 * @example
 * Instantiate a Host and feed it some extensions, watching as each loads.
 * ```javascript
 * import { Host } from `@adobe/uix-host`
 *
 * const host = new Host({ hostName: 'example' });
 *
 * const extensions = await fetch(EXTENSION_REGISTRY).then(res => res.json());
 *
 * host.addEventListener('loadallguests', event => {
 *   const { failed, loaded } = event.detail;
 *   failed.forEach(error => console.error('Extension load failed!', error));
 *   loaded.forEach(extension => {
 *     await extension.apis.someNamespace.someMethod();
 *   })
 * })
 * ```
 *
 * @example
 * Load only the guests which have registered the namespace 'appliances' and two
 * specific methods on that namespace.
 * ```javascript
 * host.addEventListener('loadallguests', () => {
 *   const applianceGuests = host.getLoadedGuests({
 *     appliances: ['getRefrigeratorContents', 'getOvenTemp']
 *   });
 *   const ingredients = {};
 *   let allOvensOff = true;
 *   await Promise.all(applianceGuests.map(async guest => {
 *     const foods = await guest.apis.appliances.getRefrigeratorContents();
 *     Object.assign(ingredients, foods);
 *     if ((await guest.getOvenTemp()) > 27) {
 *       allOvensOff = alse;
 *     }
 *   }));
 * })
 * ```
 *
 * A React binding is currently available. See {@link
 * @adobe/uix-host-react#Extensible}, {@link
 * @adobe/uix-host-react#useExtensions}, and {@link
 * @adobe/uix-host-react#GuestUIFrame}.
 *
 */
export * from "./host.js";
export * from "./port.js";
export * from "./extensions-provider/index.js";
export * from "./dom-utils/index.js";
