<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-host](./uix-host.md) &gt; [combineExtensionsFromProviders](./uix-host.combineextensionsfromproviders.md)

## combineExtensionsFromProviders() function

Combine multiple [ExtensionsProvider](./uix-host.extensionsprovider.md) callbacks into a single callback, which aggregates and dedupes all extensions from all providers into one namespaced object.

**Signature:**

```typescript
export declare function combineExtensionsFromProviders(...providers: Array<ExtensionsProvider>): ExtensionsProvider;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  providers | Array&lt;[ExtensionsProvider](./uix-host.extensionsprovider.md)<!-- -->&gt; |  |

**Returns:**

[ExtensionsProvider](./uix-host.extensionsprovider.md)

