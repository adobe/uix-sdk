import { DataStore } from "./data-store";
import { PublishSubscribe, SubscriptionType } from "./pubsub";

export interface ExtensibleStoreManagerInterface {
  set: (key: string, value: unknown, scope?: string) => void;
  get: (key: string, scope?: string) => unknown;
  subscribe: (
    property: string,
    callback: SubscriptionType,
    scope?: string
  ) => void;
  unsubscribe: (
    property: string,
    callback: SubscriptionType,
    scope?: string
  ) => void;
  publish: (property: string, value: unknown) => void;
}

interface StoreInterface {
  set(key: string, value: unknown): void;
  get(key: string): unknown;
}

export class ExtensibleStoreManager implements ExtensibleStoreManagerInterface {
  private readonly store: StoreInterface;
  private publishSubscriber: PublishSubscribe;
  private static instance: ExtensibleStoreManagerInterface;
  private readonly scope: string;

  constructor() {
    this.store = DataStore.getInstance();
    this.publishSubscriber = PublishSubscribe.getInstance();
    this.scope = "default";
  }

  public static getInstance(): ExtensibleStoreManagerInterface {
    if (!ExtensibleStoreManager.instance) {
      ExtensibleStoreManager.instance = new ExtensibleStoreManager();
    }
    return ExtensibleStoreManager.instance;
  }

  public set(key: string, value: unknown, scope?: string) {
    const dataScope = scope ?? this.scope;
    const current = this.store.get(`${dataScope}.${key}`);
    if (current !== value) {
      this.store.set(`${dataScope}.${key}`, value);
      this.publishSubscriber.publish(`${dataScope}.${key}`, value);
    }
  }

  public get(key: string, scope?: string): unknown {
    const dataScope = scope ?? this.scope;
    return this.store.get(`${dataScope}.${key}`);
  }

  public subscribe(
    property: string,
    callback: SubscriptionType,
    scope?: string
  ) {
    const dataScope = scope ?? this.scope;
    const prop = property !== "*" ? `${dataScope}.${property}` : property;
    this.publishSubscriber.subscribe(prop, callback);
  }

  public unsubscribe(
    property: string,
    callback: SubscriptionType,
    scope?: string
  ) {
    const dataScope = scope ?? this.scope;
    this.publishSubscriber.unsubscribe(`${dataScope}.${property}`, callback);
  }

  public publish(property: string, value: unknown) {
    this.publishSubscriber.publish(property, value);
  }
}
