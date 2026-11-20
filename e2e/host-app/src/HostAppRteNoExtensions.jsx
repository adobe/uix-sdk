import { useState, useEffect } from 'react';
import { useHost } from '@adobe/uix-host-react';

/**
 * Emulates the CF Editor Rich Text Editor's load gate when the `cf-editor`
 * extension point resolves to ZERO extensions (e.g. every candidate was
 * filtered out for not being PUBLISHED -- see App Registry status filtering).
 *
 * Mirrors `useRTEBeforeLoad`'s `ready` derivation exactly
 * (aem-headless-ui-commons: RichTextEditor/BeforeLoad.ts):
 *   - no host yet          -> not ready
 *   - host exists, !loading -> ready immediately
 *   - host exists, loading  -> wait for `loadallguests`
 *
 * Unlike the #/rte-stuck scenario (one guest connects but never reports
 * ready, so the host eventually times it out and fires `loadallguests`),
 * an empty extensions list never even creates a `Host` (see Extensible.tsx).
 * `host` therefore stays `undefined` forever and `ready` can never become
 * true -- a permanent hang, not a bounded delay.
 */
export default function HostAppRteNoExtensions() {
  const { host } = useHost();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!host) {
      setReady(false);
      return undefined;
    }

    if (!host.loading) {
      setReady(true);
      return undefined;
    }

    const onGuestsLoaded = () => setReady(true);
    host.addEventListener('loadallguests', onGuestsLoaded);
    return () => host.removeEventListener('loadallguests', onGuestsLoaded);
  }, [host]);

  return (
    <div>
      <h2>RTE no-extensions scenario</h2>
      <p id="ready-flag">{ready ? 'ready' : 'waiting'}</p>

      {ready ? (
        <div id="rte-editor" contentEditable suppressContentEditableWarning>
          Description field is editable
        </div>
      ) : (
        <div id="rte-skeleton">Loading rich text editor…</div>
      )}
    </div>
  );
}
