<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@adobe/uix-host](./uix-host.md) &gt; [Host](./uix-host.host.md)

## Host class

Manager object for connecting to [GuestServers](./uix-guest.guestserver.md) and [GuestUIs](./uix-guest.guestui.md)<!-- -->, providing and receiving their APIs, and providing them to the app for interacting with UI.

**Signature:**

```typescript
export declare class Host extends Emitter<HostEvents> 
```
**Extends:** [Emitter](./uix-core.emitter.md)<!-- -->&lt;[HostEvents](./uix-host.hostevents.md)<!-- -->&gt;

## Remarks

The Host object is the main connection manager for all UIX Guests. Making an app extensible requires creating a Host object.

The extensible app using the Hostis responsible for providing a list of extension references to the Host object. Use [createExtensionRegistryProvider()](./uix-host.createextensionregistryprovider.md) for that purpose. Once you have retrieved a list of extensions available to the host app, pass it to [Host.load()](./uix-host.host.load.md)<!-- -->.

When a Host creates a Guest, it must create an `<iframe>` element to contain the Guest's main [GuestServer](./uix-guest.guestserver.md) runtime, which runs invisibly in the background. To do this, the Host creates a hidden container in the body of the document. It is a `<div>` element with the attribute `data-uix-guest-container`<!-- -->. Loaded GuestServers will be injected into this hidden element and removed as necessary. When [Host.unload()](./uix-host.host.unload.md) is called, the Host removes the hidden container from the document after unloading.

## Events

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [contextchange](./uix-host.host.contextchange.md) |  | [HostEventContextChange](./uix-host.hosteventcontextchange.md) | Shared context has been set or updated; all guests receive this event too. |
|  [error](./uix-host.host.error.md) |  | [HostEventError](./uix-host.hosteventerror.md) | An error has occurred during loading or unloading of guests. |
|  [guestbeforeload](./uix-host.host.guestbeforeload.md) |  | [HostGuestEvent](./uix-host.hostguestevent.md)<!-- -->&lt;"beforeload"&gt; | About to attempt to load and connect to a Guest. |
|  [guestbeforeunload](./uix-host.host.guestbeforeunload.md) |  | [HostGuestEvent](./uix-host.hostguestevent.md)<!-- -->&lt;"beforeunload"&gt; | About to unload a guest and remove its [GuestServer](./uix-guest.guestserver.md) instance as well as all its [GuestUI](./uix-guest.guestui.md) instances. |
|  [guestload](./uix-host.host.guestload.md) |  | [HostGuestEvent](./uix-host.hostguestevent.md)<!-- -->&lt;"load"&gt; | One guest has loaded. |
|  [guestunload](./uix-host.host.guestunload.md) |  | [HostGuestEvent](./uix-host.hostguestevent.md)<!-- -->&lt;"unload"&gt; | Unloaded a guest and removed its [GuestServer](./uix-guest.guestserver.md) instance as well as all its [GuestUI](./uix-guest.guestui.md) instances. |
|  [loadallguests](./uix-host.host.loadallguests.md) |  | [HostEventLoadAllGuests](./uix-host.hosteventloadallguests.md) | All guests requested by host have been loaded and connected. |

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(config)](./uix-host.host._constructor_.md) |  | Constructs a new instance of the <code>Host</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [guests](./uix-host.host.guests.md) |  | [PortMap](./uix-host.portmap.md) | A Map of of the loaded guests. |
|  [hostName](./uix-host.host.hostname.md) |  | string | Unique string identifying the Host object. |
|  [loading](./uix-host.host.loading.md) |  | boolean | <code>true</code> if any extension in [Host.guests](./uix-host.host.guests.md) has created a [GuestServer](./uix-guest.guestserver.md)<!-- -->, but the Guest has not yet loaded. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [getLoadedGuests()](./uix-host.host.getloadedguests.md) |  | Return all loaded guests. |
|  [getLoadedGuests(filter)](./uix-host.host.getloadedguests_1.md) |  | Return loaded guests which satisfy the passed test function. |
|  [getLoadedGuests(capabilities)](./uix-host.host.getloadedguests_2.md) |  | Return loaded guests which expose the provided [CapabilitySpec](./uix-host.capabilityspec.md)<!-- -->. |
|  [load(extensions, options)](./uix-host.host.load.md) |  | Load extension into host application from provided extension description. Returned promise resolves when all extensions are loaded and registered. |
|  [shareContext(context)](./uix-host.host.sharecontext.md) |  | Set the object of shared values that all Guests can access via [GuestServer.sharedContext](./uix-guest.guestserver.sharedcontext.md)<!-- -->. This overwrites any previous object. |
|  [shareContext(setter)](./uix-host.host.sharecontext_1.md) |  | Update the object of shared values that all Guests can access via [GuestServer.sharedContext](./uix-guest.guestserver.sharedcontext.md)<!-- -->. This method takes a callback which receives the previous context and may return an entirely new context, or new values merged with the old context. |
|  [shareContext(setter)](./uix-host.host.sharecontext_2.md) |  |  |
|  [unload()](./uix-host.host.unload.md) |  | Unload all extensions and remove their frames/workers. Use this to unmount a UI or when switching to a different extensible UI. |

