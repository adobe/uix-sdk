import { connectToParent, Methods } from "penpal";

type AreaId = string;
type ApisByType = Record<string, Methods>;

interface ApisByArea extends Methods {
  [k: AreaId]: ApisByType;
}

interface Host extends Methods {
  invokeCallback<T>(callbackName: string, args: unknown[]): T;
}

class GuestInFrame {
  methods: ApisByArea;
  #host!: Host;
  constructor() {}
  register(apis: ApisByArea) {
    this.methods = apis;
    this.#connect();
  }
  invokeHostCallback<T>(callbackName: string, args: unknown[]): T {
    return this.#host.invokeCallback<T>(callbackName, args);
  }
  async #connect() {
    try {
      const connection = await connectToParent<Host>({
        methods: this.methods,
      });
      console.debug("connection began", connection);
      const host = await connection.promise;
      console.debug("connection established", host);
      this.#host = host as unknown as Host;
    } catch (e) {
      console.error("connection failed", e);
    }
  }
}

export default new GuestInFrame();
