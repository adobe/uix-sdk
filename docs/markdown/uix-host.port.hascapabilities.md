<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-host](./uix-host.md) &gt; [Port](./uix-host.port.md) &gt; [hasCapabilities](./uix-host.port.hascapabilities.md)

## Port.hasCapabilities() method

Returns true if the guest has registered methods matching the provided capability spec. A capability spec is simply an object whose properties are declared in an array of keys, description the names of the functions and methods that the Port will expose.

**Signature:**

```typescript
hasCapabilities(requiredCapabilities: CapabilitySpec<GuestApis>): boolean;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  requiredCapabilities | [CapabilitySpec](./uix-host.capabilityspec.md)<!-- -->&lt;GuestApis&gt; |  |

**Returns:**

boolean

