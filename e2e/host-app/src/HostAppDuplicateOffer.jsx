import { Extensible, GuestUIFrame } from '@adobe/uix-host-react';

const provider = async () => ({
  extensionId: { id: 'extensionId', url: 'http://localhost:3002#/register?id=extensionId' },
});

// The actual duplicate-offer injection happens inside the guest itself
// (DuplicateOfferProbe.jsx) - postMessage's event.source on the receiving
// end reflects whichever realm's code called .postMessage(), so faking a
// message "from the guest" has to originate from inside the guest's own
// window, not the host's. ?inject=0 in the host URL is threaded through to
// the guest's own query string to run a control scenario with no injected
// duplicate.
function buildUiFrameUrl() {
  const inject = window.location.hash.includes('inject=0') ? '0' : '1';
  return `http://localhost:3002#/ui-frame-ping?id=extensionId&timeout=5000&pingDelay=2000&inject=${inject}`;
}

export default function HostAppDuplicateOffer() {
  return (
    <div>
      <h2>Duplicate Offer Race Scenario</h2>
      <Extensible debug={true} extensionsProvider={provider}>
        <GuestUIFrame
          id="iframe-under-test"
          guestId="extensionId"
          src={buildUiFrameUrl()}
          privateMethods={{ probe: { ping: () => 'pong' } }}
        />
      </Extensible>
    </div>
  );
}
