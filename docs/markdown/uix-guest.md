<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-guest](./uix-guest.md)

## uix-guest package

Tools for UI Extensions meant to run inside extensible apps. Connects Extensions running in their own window contexts with the host app, allowing the host and guest to exchange method, events, and signals.

## Remarks

The core object of this library, which extensions use for communication, is the Guest object. There are two variants of the Guest object [GuestServer](./uix-guest.guestserver.md) for the bootstrap frame which your extension keeps running in the background, and [GuestUI](./uix-guest.guestui.md) for frames meant to be displayed in the host application. An extension must have one GuestServer frame, and the host app may choose to use one or more GuestUI frames.

## Example 1

Creating and connecting a GuestServer with [register()](./uix-guest.register.md)

```typescript
import { register } from "@adobe/uix-guest";

const server = await register({
  // Must match extension ID from registry
  id: "My Custom View Extension",
  // enable logging in dev build
  debug: process.env.NODE_ENV !== "production",
  // Host can access these methods from its Port to this guest
  methods: {
    // Methods must be namespaced by one or more levels
    myCustomView: {
      async documentIsViewable(docId) {
        const doc = await callMyRuntimeAction(docId);
        return someValidation(doc);
      },
      renderView(docId, depth) {
        // Use a host method
        const tooltip = await server.host.editor.requestTooltip({
          type: 'frame',
          url: new URL(`/show/${docId}`, location).href
        })
      }
    },
  },
})
```

## Example 2

Connecting to an existing GuestServer with a GuestUI

```typescript
import { attach } from "@adobe/uix-guest";

const ui = await attach({
  id: "My Custom View Extension",
})

// when editing is done:
const saved = await ui.host.editor.saveChanges();
if (!saved) {
  const editorState = ui.sharedContext.get('editorState');
  if (editorState.tooltips[ui.id].invalid === true) {
    putGuestUIInInvalidState();
  }
} else {
  ui.host.editor.dismissTooltip();
}
```

## Classes

|  Class | Description |
|  --- | --- |
|  [GuestServer](./uix-guest.guestserver.md) | A Guest to be used in the "main" or primary frame of an extension, the frame the Host loads first. |
|  [GuestUI](./uix-guest.guestui.md) | A Guest to be used in an extension-controlled frame, usually to display UI. |
|  [SharedContext](./uix-guest.sharedcontext.md) | A <code>Map</code> representing the [HostConfig.sharedContext](./uix-host.hostconfig.sharedcontext.md) object. |

## Functions

|  Function | Description |
|  --- | --- |
|  [attach(config)](./uix-guest.attach.md) | Connect to a running [GuestServer](./uix-guest.guestserver.md) to share its context and render UI. |
|  [createGuest(config)](./uix-guest.createguest.md) | Create and immediately return a [GuestServer](./uix-guest.guestserver.md)<!-- -->. |
|  [register(config)](./uix-guest.register.md) | Initiate a connection to the host app and its extension points. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [GuestConfig](./uix-guest.guestconfig.md) |  |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [GuestConfigWithMethods](./uix-guest.guestconfigwithmethods.md) |  |
|  [GuestEvent](./uix-guest.guestevent.md) |  |
|  [GuestEventBeforeConnect](./uix-guest.guesteventbeforeconnect.md) |  |
|  [GuestEventConnected](./uix-guest.guesteventconnected.md) |  |
|  [GuestEventContextChange](./uix-guest.guesteventcontextchange.md) |  |
|  [GuestEventError](./uix-guest.guesteventerror.md) |  |
|  [GuestEvents](./uix-guest.guestevents.md) |  |

