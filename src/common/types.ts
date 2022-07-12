export interface CapabilitySpec {
  [k: string]: CapabilitySpec | string[];
}

type MethodMap<T extends string[]> = {
  [k in T[number]]: () => void;
};

export type GuestCapability<T extends CapabilitySpec | string[]> = {
  [Name in keyof T]: T[Name] extends CapabilitySpec
    ? GuestCapability<T[Name]>
    : T[Name] extends string[]
    ? MethodMap<T[Name]>
    : unknown;
};

export type RequiredMethodsByName<Apis extends NamespacedApis> = {
  [Name in keyof Apis]: (keyof Apis[Name])[];
};

export type ApiMethod = (...args: any[]) => Promise<any>;

export type GuestApi = {
  [methodName: string]: ApiMethod;
};

export interface NamespacedApis {
  [k: string]: NamespacedApis | GuestApi;
}

export interface Extension {
  id: string;
  url: string;
}

export interface GuestConnection {
  updateHostMethods<T extends NamespacedApis>(
    newMethods: RequiredMethodsByName<T>
  ): void;
}

export interface HostMethodAddress {
  path: string[];
  name: string;
  args: unknown[];
}

export interface HostConnection {
  invokeHostMethod<T>(address: HostMethodAddress): T;
}
