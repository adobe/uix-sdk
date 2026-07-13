import React, { useState, useEffect } from 'react';
import { Extensible, useExtensions, useHost, GuestUIFrame } from '@adobe/uix-host-react';

const provider = async () => ({
  extensionId: { id: 'extensionId', url: 'http://localhost:3002#/register' },
});

// Renders a visible marker if any descendant throws during render, instead of
// letting the whole host tree unmount. Before the fix, GuestUIFrame threw
// (`new URL(src, guest.url.href)` on an undefined guest) when its guest had
// been removed, taking the host UI down with it.
class FrameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) {
      return <div id="host-crashed">Guest frame crashed the host</div>;
    }
    return this.props.children;
  }
}

function UndefinedGuestContent() {
  const { extensions = [] } = useExtensions(() => ({
    requires: { extensionNamespace: ['getMessage', 'setMessage'] },
  }));
  const { host } = useHost();
  const [frame, setFrame] = useState(null);
  const [removed, setRemoved] = useState(false);

  // Capture the guest id/src once it has loaded, and keep them even after the
  // guest is later removed — so the frame stays mounted with a now-stale id,
  // exactly reproducing the host.modal.close() teardown from the ticket.
  useEffect(() => {
    const ext = extensions[0];
    if (ext && !frame) {
      setFrame({
        id: ext.id,
        src: ext.url.href ? ext.url.href.replace('register', '') : '',
      });
    }
  }, [extensions, frame]);

  const handleRemove = async () => {
    if (host && frame) {
      // Mirrors what host.modal.close() does internally: unload + drop the guest.
      await host.removeGuest(frame.id, { url: '' });
      setRemoved(true); // force a re-render of the still-mounted frame
    }
  };

  return (
    <div>
      <div id="host-alive">host alive</div>
      <p id="frame-guest-id">{frame ? frame.id : ''}</p>
      <p id="frame-removed">{String(removed)}</p>
      <button id="remove-guest-button" onClick={handleRemove}>
        Remove guest
      </button>
      <div className="iframe-wrapper">
        <FrameErrorBoundary>
          {frame && (
            <GuestUIFrame
              id="iframe-for-guest"
              guestId={frame.id}
              src={frame.src}
            />
          )}
        </FrameErrorBoundary>
      </div>
    </div>
  );
}

export default function HostAppUndefinedGuest() {
  return (
    <Extensible debug={true} extensionsProvider={provider}>
      <UndefinedGuestContent />
    </Extensible>
  );
}
