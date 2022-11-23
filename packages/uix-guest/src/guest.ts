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

/* eslint @typescript-eslint/no-explicit-any: "off" */
import type {
  RemoteHostApis,
  HostConnection,
  NamedEvent,
  Phantogram,
  VirtualApi,
} from "@adobe/uix-core";
import {
  Emitter,
  makeNamespaceProxy,
  connectParentWindow,
  timeoutPromise,
  quietConsole,
} from "@adobe/uix-core";
import { debugGuest } from "./debug-guest.js";

/**
 * @public
 */
export type GuestEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = NamedEvent<
  Type,
  Detail &
    Record<string, unknown> & {
      guest: Guest;
    }
>;

/**
 * @public
 */
export type GuestEventContextChange = GuestEvent<
  "contextchange",
  { context: Record<string, unknown> }
>;

/** @public */
export type GuestEventBeforeConnect = GuestEvent<"beforeconnect">;
/** @public */
export type GuestEventConnected = GuestEvent<"connected">;
/** @public */
export type GuestEventError = GuestEvent<"error", { error: Error }>;

/**
 * @public
 */
export type GuestEvents =
  | GuestEventContextChange
  | GuestEventBeforeConnect
  | GuestEventConnected
  | GuestEventError;

/**
 * @public
 */
export interface GuestConfig {
  /**
   * String slug identifying extension. This may need to use IDs from an
   * external system in the future.
   */
  id: string;
  /**
   * Set debug flags on all libraries that have them, and add loggers to SDK
   * objects. Log a lot to the console.
   */
  debug?: boolean;
  /**
   * Time out and stop trying to reach the host after this many milliseconds
   */
  timeout?: number;
}

/**
 * A `Map` representing the {@link @adobe/uix-host#HostConfig.sharedContext}
 * object.
 *
 * @remarks While the Host object is a plain JavaScript object. the `sharedContext` in the Guest object implements the {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map | Map} interface.
 *
 * @example
 * In the host app window, the Host object shares context:
 * ```javascript
 *host.shareContext({
 *  someAuthToken: 'abc'
 *});
 * ```
 *
 * After the `contentchange` event has fired in the guest window:
 * ```javascript
 * guest.sharedContext.get('someAuthToken') === 'abc'
 * ```
 * @public
 */
export class SharedContext {
  private _map: Map<string, unknown>;
  constructor(values: Record<string, unknown>) {
    this.reset(values);
  }
  private reset(values: Record<string, unknown>) {
    this._map = new Map(Object.entries(values));
  }
  /**
   * @public
   * Retrieve a copy of a value from the {@link @adobe/uix-host#HostConfig.sharedContext} object. *Note that this is not a reference to any actual objects from the parent. If the parent updates an "inner object" inside the SharedContext, that change will not be reflected in the Guest!*
   */
  get(key: string) {
    return this._map.get(key);
  }
}

/**
 * Generic Guest object, with methods shared by all types of Guest.
 * @internal
 */
export class Guest<
  Incoming extends object = VirtualApi
> extends Emitter<GuestEvents> {
  /**
   * Shared context has been set or updated.
   * @eventProperty
   */
  public contextchange: GuestEventContextChange;
  /**
   * About to attempt connection to the host.
   * @eventProperty
   */
  public beforeconnect: GuestEventBeforeConnect;
  /**
   * Host connection has been established.
   * @eventProperty
   */
  public connected: GuestEventConnected;
  /**
   * Host connection has failed.
   * @eventProperty
   */
  public error: GuestEventError;
  /**
   * {@inheritdoc SharedContext}
   */
  sharedContext: SharedContext;
  logger: Console = quietConsole;

  /**
   * @param config - Initializer for guest object, including ID.
   */
  constructor(config: GuestConfig) {
    super(config.id);
    if (typeof config.timeout === "number") {
      this.timeout = config.timeout;
    }
    if (config.debug) {
      this.logger = debugGuest(this);
    }
    this.addEventListener("contextchange", (event) => {
      this.sharedContext = new SharedContext(event.detail.context);
    });
  }
  /**
   * Proxy object for calling methods on the host.
   *
   * @remarks Any APIs exposed to the extension via {@link @adobe/uix-host#Port.provide}
   * can be called on this object. Because these methods are called with RPC,
   * they are all asynchronous, The return types of all Host methods will be
   * Promises which resolve to the value the Host method returns.
   * @public
   */
  host: RemoteHostApis<Incoming> = makeNamespaceProxy<Incoming>(
    async (address) => {
      await this.hostConnectionPromise;
      try {
        const result = await timeoutPromise(
          10000,
          this.hostConnection.getRemoteApi().invokeHostMethod(address)
        );
        return result;
      } catch (e) {
        const error =
          e instanceof Error ? e : new Error(e as unknown as string);
        const methodError = new Error(
          `Host method call host.${address.path.join(".")}() failed: ${
            error.message
          }`
        );
        this.logger.error(methodError);
        throw methodError;
      }
    }
  );
  private timeout = 10000;
  private hostConnectionPromise: Promise<Phantogram<HostConnection>>;
  private hostConnection!: Phantogram<HostConnection>;
  /** @internal */
  protected getLocalMethods() {
    return {
      emit: (...args: Parameters<typeof this.emit>) => {
        this.logger.log(`Event "${args[0]}" emitted from host`);
        this.emit(...args);
      },
    };
  }
  /**
   * Accept a connection from the Host.
   * @returns A Promise that resolves when the Host has established a connection.
   * @deprecated It is preferable to use {@link register} for primary frames,
   * and {@link attach} for UI frames and other secondary frames, than to
   * instantiate a Guest and then call `.connect()` on it. The latter style
   * returns an object that cannot be used until it is connected, and therefore
   * risks errors.
   * @public
   */
  async connect() {
    return this._connect();
  }

  /**
   * @internal
   */
  async _connect() {
    this.emit("beforeconnect", { guest: this });
    try {
      const hostConnectionPromise = connectParentWindow<HostConnection>(
        {
          targetOrigin: "*",
          timeout: this.timeout,
        },
        this.getLocalMethods()
      );

      this.hostConnectionPromise = hostConnectionPromise;
      this.hostConnection = await this.hostConnectionPromise;
    } catch (e) {
      this.emit("error", { guest: this, error: e });
      this.logger.error("Connection failed!", e);
      return;
    }
    try {
      this.sharedContext = new SharedContext(
        await this.hostConnection.getRemoteApi().getSharedContext()
      );
    } catch (e) {
      this.emit("error", { guest: this, error: e });
      this.logger.error("getSharedContext failed!", e);
    }
  }
}
