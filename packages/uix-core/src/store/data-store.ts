interface DataStoreInterface {
  [key: string]: unknown;
}

export class DataStore {
  private readonly store: DataStoreInterface;
  private static instance: DataStore;

  constructor() {
    this.store = {};
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  public set(key: string, value: unknown) {
    this.store[key] = value;
  }

  public get(key: string): unknown {
    return this.store[key];
  }
}
