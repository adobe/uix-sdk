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

import type { GuestApis } from "@adobe/uix-core";
import type { SharedContext } from "./guest";
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
export class GuestServer<Outgoing extends GuestApis> extends Guest<Outgoing> {
  private localMethods: Outgoing;
  protected getLocalMethods() {
    return {
      ...super.getLocalMethods(),
      apis: this.localMethods,
    };
  }
  /**
   * {@inheritDoc BaseGuest.sharedContext}
   */
  sharedContext: SharedContext;
  /**
   * {@inheritdoc BaseGuest.host}
   */
  host: Guest<Outgoing>["host"];
  /**
   * Pass an interface of methods which Host may call as callbacks.
   *
   * @remarks It is preferable to use {@link register} to obtain a guest object
   * and register local methods in one step. The returned guest object will be
   * pre-registered and connected.
   * @public
   */
  async register(implementedMethods: Outgoing) {
    this.localMethods = implementedMethods;
    return this._connect();
  }
}
