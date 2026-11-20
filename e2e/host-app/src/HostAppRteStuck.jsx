import { useState, useEffect } from 'react';
import { useHost } from '@adobe/uix-host-react';

/**
 * Emulates the CF Editor Rich Text Editor's load gate (SITES-49454).
 *
 * In the real editor, `RichTextEditorTipTap` keeps `contentLoading = true` and
 * renders the loading skeleton until `useRTEBeforeLoad().ready` becomes true.
 * That `ready` signal is derived ENTIRELY from the extensibility host: it only
 * flips once the host has finished handshaking every guest -- i.e. once
 * `host.loading` goes false / the `loadallguests` event fires. There is no
 * independent fallback timeout on the editor side.
 *
 * This component reproduces that gate exactly: `ready` starts false (skeleton
 * shown) and only becomes true when the host emits `loadallguests`. When one
 * guest connects but never reports ready (see ExtentionStuck), the host cannot
 * fire `loadallguests` until that guest's connection times out, so the skeleton
 * stays up for the full timeout even though the healthy RTE extension connected
 * almost immediately.
 */
export default function HostAppRteStuck() {
  const { host } = useHost();
  const [ready, setReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    if (!host) return;

    const onLoadAll = (event) => {
      const { loaded = [], failed = [] } = event.detail || {};
      setLoadedCount(loaded.length);
      setFailedCount(failed.length);
      setReady(true);
    };

    host.addEventListener('loadallguests', onLoadAll);
    return () => host.removeEventListener('loadallguests', onLoadAll);
  }, [host]);

  return (
    <div>
      <h2>RTE stuck-loading scenario</h2>
      <p id="ready-flag">{ready ? 'ready' : 'waiting'}</p>
      <p id="loaded-count">{loadedCount}</p>
      <p id="failed-count">{failedCount}</p>

      {ready ? (
        <div
          id="rte-editor"
          contentEditable
          suppressContentEditableWarning
        >
          Description field is editable
        </div>
      ) : (
        <div id="rte-skeleton">Loading rich text editor…</div>
      )}
    </div>
  );
}
