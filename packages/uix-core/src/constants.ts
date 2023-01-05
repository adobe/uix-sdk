declare const UIX_SDK_VERSION: string;
declare const UIX_SDK_BUILDMODE: string;

/** @internal */
export const NS_ROOT = "_$pg";
export const VERSION = UIX_SDK_VERSION;
export const BUILDMODE = UIX_SDK_BUILDMODE;
export const SYM_CLEANUP = Symbol(`${NS_ROOT}_cleanup`);
export const SYM_INTERNAL = Symbol(`${NS_ROOT}_internal`);
export const INIT_CALLBACK = `${NS_ROOT}_init_cb`;
