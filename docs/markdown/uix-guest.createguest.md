<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-guest](./uix-guest.md) &gt; [createGuest](./uix-guest.createguest.md)

## createGuest() function

> Warning: This API is now obsolete.
> 
> Use [attach()](./uix-guest.attach.md) or [register()](./uix-guest.register.md)<!-- -->, which return Promises that resolve once the guest is connected.
> 

Create and immediately return a [GuestServer](./uix-guest.guestserver.md)<!-- -->.

**Signature:**

```typescript
export declare function createGuest(config: GuestConfig): GuestServer<GuestApis>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  config | [GuestConfig](./uix-guest.guestconfig.md) |  |

**Returns:**

[GuestServer](./uix-guest.guestserver.md)<!-- -->&lt;GuestApis&gt;

