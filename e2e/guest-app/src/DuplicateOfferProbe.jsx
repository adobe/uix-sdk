import React, { useEffect, useRef, useState } from 'react';
import { attach } from '@adobe/uix-guest';

// Only changes if this module is genuinely re-evaluated (a real reload),
// not on a hash-only route change or parent re-render.
const bootId = Math.random().toString(36).slice(2, 10);

function log(message) {
  // eslint-disable-next-line no-console
  console.log(`[uix-e2e-duplicate-offer] ${bootId} ${message}`);
}

export default function DuplicateOfferProbe() {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [pingStatus, setPingStatus] = useState('pending');
  const [pingError, setPingError] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const hashSearch = window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(hashSearch);
    const extensionId = params.get('id') || 'extensionId';
    const timeout = Number(params.get('timeout')) || 5000;
    const pingDelay = Number(params.get('pingDelay')) || 2000;
    const inject = params.get('inject') !== '0';

    // Simulate the guest's own 100ms retry loop (Tunnel.toParent's
    // sendOffer) firing one more time just as the host's "accepted" reply
    // was in flight - the race behind SITES-48958. This must run INSIDE
    // the guest's own realm: postMessage's `event.source` on the receiving
    // end is whichever window's code actually called `.postMessage()`, so
    // replaying from the host side would appear to come from the host, not
    // the guest, and the host's isFromOrigin check would (correctly, from
    // its own perspective) ignore it - it wouldn't test anything. The
    // handshake offer is the very first thing the SDK ever posts to
    // window.parent (the "guest-ready" message only fires after connecting),
    // so capturing the first call is enough - no need to inspect its shape.
    if (inject && window.parent && window.parent !== window) {
      const originalPostMessage = window.parent.postMessage.bind(window.parent);
      let capturedArgs = null;
      window.parent.postMessage = function (...args) {
        if (!capturedArgs) {
          capturedArgs = args;
          log('captured first message to parent, scheduling replay in 800ms');
          setTimeout(() => {
            log('replaying captured message to parent');
            originalPostMessage(...capturedArgs);
          }, 800);
        }
        return originalPostMessage(...args);
      };
    }

    log(`booted, attaching as "${extensionId}" (timeout ${timeout}ms, inject=${inject})`);

    attach({ id: extensionId, timeout })
      .then((guestConnection) => {
        log('attach resolved: connected');
        setStatus('connected');

        // Give the replay time to land (or not), then make a real RPC
        // call over the tunnel. If the race silently swapped in a dead
        // port pair, this hangs until the SDK's own ~10s host-call
        // timeout rejects it.
        setTimeout(() => {
          log('sending post-connect ping');
          guestConnection.host.probe
            .ping()
            .then((result) => {
              log(`ping resolved: ${result}`);
              setPingStatus('ok');
            })
            .catch((e) => {
              const message = (e && e.message) || String(e);
              log(`ping failed: ${message}`);
              setPingStatus('error');
              setPingError(message);
            });
        }, pingDelay);
      })
      .catch((e) => {
        const message = (e && e.message) || String(e);
        log(`attach rejected: ${message}`);
        setStatus('error');
        setError(message);
      });
  }, []);

  return (
    <div>
      <p>Duplicate offer probe</p>
      <p id="boot-id">{bootId}</p>
      <p id="attach-status">{status}</p>
      <p id="attach-error">{error}</p>
      <p id="ping-status">{pingStatus}</p>
      <p id="ping-error">{pingError}</p>
    </div>
  );
}
