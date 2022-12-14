<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-host-react](./uix-host-react.md) &gt; [UseExtensionsConfig](./uix-host-react.useextensionsconfig.md)

## UseExtensionsConfig interface


<b>Signature:</b>

```typescript
export interface UseExtensionsConfig<Incoming extends GuestApis, Outgoing extends VirtualApi> 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [provides?](./uix-host-react.useextensionsconfig.provides.md) |  | Outgoing | <i>(Optional)</i> A namespaced object of methods which extensions will be able to call. |
|  [requires?](./uix-host-react.useextensionsconfig.requires.md) |  | [CapabilitySpec](./uix-host.capabilityspec.md)<!-- -->&lt;Incoming&gt; | <i>(Optional)</i> A [CapabilitySpec](./uix-host.capabilityspec.md) describing the namespaced methods extensions must implement to be used by this component. |
|  [updateOn?](./uix-host-react.useextensionsconfig.updateon.md) |  | "each" \| "all" | <i>(Optional)</i> Sets when re-render is triggered on extension load. |

