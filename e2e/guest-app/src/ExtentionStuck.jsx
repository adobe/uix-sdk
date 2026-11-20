import React, { useEffect } from 'react';
import { connectParentWindow } from '@adobe/uix-core';

/**
 * A guest that reproduces the extensibility flaw behind the CF Editor RTE
 * "stuck on loading skeleton" incident (SITES-49454).
 *
 * A normal guest (`register()`) does two things when it connects:
 *   1. Completes the low-level tunnel handshake + API exchange with the host.
 *      This is what makes the host's `Port.connect()` -> `attachFrame()` resolve
 *      and capture the guest SDK version.
 *   2. AFTER that, posts a one-shot `window.parent.postMessage({ type:
 *      'guest-ready' })`. Since guest SDK >= 1.1.4, the host waits for this
 *      message (with a `timeout` ms deadline) before marking the guest loaded.
 *
 * This guest does step 1 but deliberately SKIPS step 2. The extension therefore
 * "connects" but never reports as finally loaded, so the host's guest-ready wait
 * hangs for the full `timeout` before rejecting. Because the host only fires
 * `loadallguests` / clears `host.loading` after ALL guests settle, this single
 * never-ready guest stalls the whole extension point -- exactly what stalled the
 * RTE's `beforeLoad` readiness gate in production.
 */
export default function ExtensionStuck() {
  useEffect(() => {
    const hashSearch = window.location.hash.split('?')[1] || '';
    const extensionId =
      new URLSearchParams(hashSearch).get('id') || 'ext-stuck';

    // Same tunnel handshake `register()` performs internally, minus the final
    // `guest-ready` postMessage. A large timeout keeps the guest side of the
    // tunnel alive well past the host's (shorter) guest-ready deadline.
    connectParentWindow(
      { targetOrigin: '*', timeout: 60000 },
      {
        apis: {
          extensionNamespace: {
            getMessage: async () => 'Message from stuck guest',
            setMessage: async () => 'Success',
          },
        },
        emit: async () => {},
        metadata: { id: extensionId, extensions: [] },
      }
    ).catch(() => {
      // The host tears the tunnel down after its guest-ready timeout; swallow
      // the resulting rejection so it doesn't surface as an unhandled error.
    });
  }, []);

  return <p>Guest app stuck view (connects but never reports ready)</p>;
}
