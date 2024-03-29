<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-host](./uix-host.md) &gt; [Host](./uix-host.host.md) &gt; [shareContext](./uix-host.host.sharecontext_1.md)

## Host.shareContext() method

Update the object of shared values that all Guests can access via [GuestServer.sharedContext](./uix-guest.guestserver.sharedcontext.md)<!-- -->. This method takes a callback which receives the previous context and may return an entirely new context, or new values merged with the old context.

**Signature:**

```typescript
shareContext(setter: (context: SharedContextValues) => SharedContextValues): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  setter | (context: [SharedContextValues](./uix-host.sharedcontextvalues.md)<!-- -->) =&gt; [SharedContextValues](./uix-host.sharedcontextvalues.md) |  |

**Returns:**

void

## Remarks

This callback pattern allows the shared context values to be mutable while the internal context object references are immutable, which is important for synchronizing. with guests.

## Example 1

Overwrites a context object based on the previous one.

```javascript
host.shareContext(oldContext => ({
  counter: oldContext.counter + 1
}))
```

## Example 2

Updates a context while preserving other existing values.

```javascript
host.shareContext(oldContext => ({
  ...oldContext,
  counter: oldContext.counter + 1
}))
```

