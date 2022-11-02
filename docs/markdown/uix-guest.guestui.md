<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-guest](./uix-guest.md) &gt; [GuestUI](./uix-guest.guestui.md)

## GuestUI class

A Guest to be used in an extension-controlled frame, usually to display UI.

<b>Signature:</b>

```typescript
export declare class GuestUI<IHost extends VirtualApi> extends Guest<IHost> 
```
<b>Extends:</b> Guest&lt;IHost&gt;

## Remarks

This is the object returned when calling [attach()](./uix-guest.attach.md)<!-- -->. It represents an additional frame or runtime created by the host application, on behalf of the extension's control frame which is running the [GuestServer](./uix-guest.guestserver.md)<!-- -->. It is a "secondary" guest object, which a host won't use before the control frame has connected. It exposes a subset of the functionality of the [GuestServer](./uix-guest.guestserver.md)<!-- -->.

Unlike the [GuestServer](./uix-guest.guestserver.md)<!-- -->, it cannot register methods or update the , but it remains in sync with the GuestServer and can access the  of the control frame, as well as any of the published methods on the host.

Extensible host apps using the React bindings will likely render GuestUI frames using the [GuestUIFrame()](./uix-host-react.guestuiframe.md) component.

## Example

When an extensible app renders this page, [attach()](./uix-guest.attach.md) creates a GuestUI. Once it attaches to the host, it

```javascript
import React, { useEffect, useState } from "react";
import { attach } from "@adobe/uix-guest";
import { Tooltip } from "./tooltip";

export default function PopupOverlay(props) {
  // how large am I?
  const [dimensions, setDimensions] = useState(
    document.body.getBoundingClientRect()
  );
  // if possible, use language preloaded in query parameters
  const [language, setLanguage] = useState(props.params.lang)

  // attach only once, in a useEffect
  useEffect(() => {
    attach({
      id: "my-extension-id",
      debug: true,
    })
    .then(guestUI => {
      // this event fires whenever the host, or the control frame, changes
      // any sharedContext value
      guestUI.addEventListener("contextchange", ({ detail: { context }}) => {
        setLanguage(context.lang)
      });
      // how large does the host want me to be?
      return guestUI.host.tooltips.getDimensions()
    .then(setDimensions)
    })
    .catch((e) => {
      console.error("ui attach failed", e);
    });
  }, []);
  // render UI! Due to the setup and useState, this component will re-render
  // once attach() is complete.
  return (
    <Tooltip {...props.params} lang={language} dimensions={dimensions} />
  );
}
```

## Events

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [beforeconnect](./uix-guest.guestui.beforeconnect.md) |  | [GuestEventBeforeConnect](./uix-guest.guesteventbeforeconnect.md) | About to attempt connection to the host. |
|  [connected](./uix-guest.guestui.connected.md) |  | [GuestEventConnected](./uix-guest.guesteventconnected.md) | Host connection has been established. |
|  [contextchange](./uix-guest.guestui.contextchange.md) |  | [GuestEventContextChange](./uix-guest.guesteventcontextchange.md) | Shared context has been set or updated. |
|  [error](./uix-guest.guestui.error.md) |  | [GuestEventError](./uix-guest.guesteventerror.md) | Host connection has failed. |

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(config)](./uix-guest.guestui._constructor_.md) |  | Constructs a new instance of the <code>GuestUI</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [host](./uix-guest.guestui.host.md) |  | RemoteHostApis&lt;IHost&gt; | Proxy object for calling methods on the host. |
