import React, { useEffect, useRef, useState } from 'react';
import { attach } from '@adobe/uix-guest';

// Computed once when this module is evaluated. It only changes if the iframe's
// browsing context is actually torn down and reloaded (a real navigation) - a
// hash-only route change or a parent re-render does NOT re-run this line.
// This is how the test detects whether moving this frame in the host's DOM
// silently reloaded it, as opposed to React simply relocating the same node.
const bootId = Math.random().toString(36).slice(2, 10);

function log(message) {
  // eslint-disable-next-line no-console
  console.log(`[uix-e2e-reorder] ${bootId} ${message}`);
}

export default function UiFrameProbe() {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const hashSearch = window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(hashSearch);
    const extensionId = params.get('id') || 'extensionId';
    const timeout = Number(params.get('timeout')) || 5000;

    log(`booted, attaching as "${extensionId}" (timeout ${timeout}ms)`);

    attach({ id: extensionId, timeout })
      .then(() => {
        log('attach resolved: connected');
        setStatus('connected');
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
      <p>UI frame probe</p>
      <p id="boot-id">{bootId}</p>
      <p id="attach-status">{status}</p>
      <p id="attach-error">{error}</p>
    </div>
  );
}
