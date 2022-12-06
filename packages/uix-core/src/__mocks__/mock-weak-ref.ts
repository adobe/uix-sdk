export class FakeWeakRef<T> {
  ref: T;
  constructor(ref: T) {
    this.ref = ref;
  }
  deref(): T {
    return this.ref;
  }
  readonly [Symbol.toStringTag]: "WeakRef";
}
