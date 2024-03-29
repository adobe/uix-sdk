<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-host-react](./uix-host-react.md) &gt; [UseExtensionsConfig](./uix-host-react.useextensionsconfig.md)

## UseExtensionsConfig interface


**Signature:**

```typescript
export interface UseExtensionsConfig<Incoming extends GuestApis, Outgoing extends VirtualApi> 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [provides?](./uix-host-react.useextensionsconfig.provides.md) |  | Outgoing | _(Optional)_ A namespaced object of methods which extensions will be able to call. |
|  [requires?](./uix-host-react.useextensionsconfig.requires.md) |  | [CapabilitySpec](./uix-host.capabilityspec.md)<!-- -->&lt;Incoming&gt; | _(Optional)_ A [CapabilitySpec](./uix-host.capabilityspec.md) describing the namespaced methods extensions must implement to be used by this component. |
|  [updateOn?](./uix-host-react.useextensionsconfig.updateon.md) |  | "each" \| "all" | _(Optional)_ Sets when re-render is triggered on extension load. |

