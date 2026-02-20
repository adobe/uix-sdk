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

import type { GuestMetadata } from "@adobe/uix-core";
import type { AppConnection, SharedContext } from "./guest";
import { Guest } from "./guest";

/**
 * A Guest to be used in the "main" or primary frame of an extension, the frame
 * the Host loads first.
 *
 * @remarks This is the Guest object returned from {@link register}. It can
 * expose internal methods to the Host via the {@link GuestServer.register}
 * method.
 *
 *
 * @public
 */
export class GuestServer<App extends AppConnection> extends Guest<App> {
  private localMethods: App["outgoing"];
  metadata: GuestMetadata;
  protected getLocalMethods() {
    return {
      ...super.getLocalMethods(),
      apis: this.localMethods,
      metadata: this.metadata,
    };
  }
  /**
   * {@inheritDoc BaseGuest.sharedContext}
   */
  declare sharedContext: SharedContext<App["sharedContext"]>;
  /**
   * {@inheritdoc BaseGuest.host}
   */
  declare host: Guest<App>["host"];
  /**
   * Pass an interface of methods which Host may call as callbacks.
   *
   * @remarks It is preferable to use {@link register} to obtain a guest object
   * and register local methods in one step. The returned guest object will be
   * pre-registered and connected.
   * @public
   */
  async register(implementedMethods: App["outgoing"], metadata: GuestMetadata) {
    this.localMethods = implementedMethods;
    this.metadata = {
      ...metadata,
      extensionId: this.id,
    };
    return this._connect();
  }
}
