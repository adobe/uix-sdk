<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-host-react](./uix-host-react.md) &gt; [UseExtensionsConfig](./uix-host-react.useextensionsconfig.md) &gt; [provides](./uix-host-react.useextensionsconfig.provides.md)

## UseExtensionsConfig.provides property

A namespaced object of methods which extensions will be able to call.

**Signature:**

```typescript
provides?: Outgoing;
```

## Remarks

This is the counterpart of `requires`<!-- -->; in `requires`<!-- -->, the you describes methods the extension must implement that your host code will call, and in `provides`<!-- -->, you implement host methods that extensions will be able to call.

Most cases for host-side methods will use the state of the component. This can cause unexpected bugs in React if the config callback is run on every render. \*\*useExtensions caches the config callback by default!\*\* So remember to pass a deps array, so that the config callback re-runs under the right conditions.

