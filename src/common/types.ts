export type ApiMethod = (...args: any[]) => Promise<any>;

export type GuestApi = {
  [methodName: string]: ApiMethod;
};

export interface NamespacedApis {
  [k: string]: NamespacedApis | GuestApi;
}

export type RequiredMethodsByName<Apis extends NamespacedApis> = {
  [Name in keyof Apis]: (keyof Apis[Name])[];
};

export interface Extension {
  id: string;
  url: string;
}

export interface HostMethodAddress {
  path: string[];
  name: string;
  args: unknown[];
}

export interface HostConnection {
  invokeHostMethod<T>(address: HostMethodAddress): T;
}
