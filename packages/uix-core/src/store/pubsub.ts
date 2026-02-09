export type SubscriptionType = (
  value: unknown,
  metadata?: { [key: string]: unknown; subscriptionProp: string }
) => void;
export type SubscriptionsListType = SubscriptionType[];
export type EventSubscriptionsType = { [key: string]: SubscriptionsListType };

export class PublishSubscribe {
  private readonly subscriptions: EventSubscriptionsType;
  private static instance: PublishSubscribe;

  constructor() {
    this.subscriptions = { "*": [] };
  }

  public static getInstance(): PublishSubscribe {
    if (!PublishSubscribe.instance) {
      PublishSubscribe.instance = new PublishSubscribe();
    }
    return PublishSubscribe.instance;
  }

  public subscribe(property: string, callback: SubscriptionType) {
    if (!this.subscriptions[property]) {
      this.subscriptions[property] = [];
    }
    this.subscriptions[property].push(callback);
  }

  public unsubscribe(property: string, callback: SubscriptionType) {
    this.subscriptions[property] = this.subscriptions[property]?.filter(
      (sub) => sub !== callback
    );
  }

  public publish(property: string, value: unknown) {
    if (!this.subscriptions[property]) {
      this.subscriptions[property] = [];
    }

    [...this.subscriptions[property], ...this.subscriptions["*"]].forEach(
      (subscription: SubscriptionType) => {
        subscription(value, { subscriptionProp: property });
      }
    );
  }
}
