<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-host](./uix-host.md) &gt; [Port](./uix-host.port.md) &gt; [provide](./uix-host.port.provide.md)

## Port.provide() method

The host-side equivalent of [register()](./uix-guest.register.md)<!-- -->. Pass a set of methods down to the guest as proxies. Merges at the first level, the API level. Overwrites a deeper levels.

**Signature:**

```typescript
provide(apis: RemoteHostApis): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  apis | RemoteHostApis |  |

**Returns:**

void

