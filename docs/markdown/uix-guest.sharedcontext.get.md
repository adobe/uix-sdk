<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-guest](./uix-guest.md) &gt; [SharedContext](./uix-guest.sharedcontext.md) &gt; [get](./uix-guest.sharedcontext.get.md)

## SharedContext.get() method

Retrieve a copy of a value from the [HostConfig.sharedContext](./uix-host.hostconfig.sharedcontext.md) object. \*Note that this is not a reference to any actual objects from the parent. If the parent updates an "inner object" inside the SharedContext, that change will not be reflected in the Guest!\*

**Signature:**

```typescript
get(key: string): unknown;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | string |  |

**Returns:**

unknown

