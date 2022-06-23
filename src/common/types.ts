export type ApiMethod = (...args: any[]) => Promise<any>;

export type GuestApi = {
  [methodName: string]: ApiMethod;
};

export type NamespacedApis = Record<string, GuestApi>;

export type RequiredMethodsByName<Apis extends NamespacedApis> = {
  [Name in keyof Apis]: (keyof Apis[Name])[];
};
