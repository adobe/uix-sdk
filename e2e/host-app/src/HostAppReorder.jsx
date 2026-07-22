import { useState } from 'react';
import { Extensible, GuestUIFrame, useExtensions } from '@adobe/uix-host-react';

// Same extension registered once (control frame via #/register); every row
// attaches its OWN UI frame (#/ui-frame) to that single registered guest -
// this mirrors a multifield where every item is rendered by the same
// extension, one live iframe per item, all sharing one Port/guest registration.
const provider = async () => ({
  extensionId: { id: 'extensionId', url: 'http://localhost:3002#/register?id=extensionId' },
});

const UI_FRAME_URL = 'http://localhost:3002#/ui-frame?id=extensionId&timeout=5000';

const ROWS_INITIAL = [
  { id: 'row-a', label: 'Row A' },
  { id: 'row-b', label: 'Row B' },
];

function Row({ rowId, label }) {
  return (
    <div id={`row-${rowId}`} data-row-id={rowId} style={{ border: '1px solid #999', margin: 8, padding: 8 }}>
      <p>{label}</p>
      <GuestUIFrame id={`iframe-${rowId}`} guestId="extensionId" src={UI_FRAME_URL} />
    </div>
  );
}

function ReorderableList() {
  const [rows, setRows] = useState(ROWS_INITIAL);
  // Positive control: gives Row A a brand new identity/key, forcing React to
  // unmount + remount it for real, so the test can confirm a genuine remount
  // still reconnects cleanly (proving the harness itself works).
  const [rowAInstance, setRowAInstance] = useState(0);

  const swap = () => {
    // Pure position swap, same object identities/keys - mirrors
    // canvasValuesStore.ts's swapMultiValues (array.splice in / splice out,
    // no re-keying).
    setRows((prev) => [prev[1], prev[0]]);
  };

  const remountRowA = () => setRowAInstance((n) => n + 1);

  return (
    <div>
      <button id="swap-rows-button" onClick={swap}>
        Swap rows
      </button>
      <button id="remount-row-a-button" onClick={remountRowA}>
        Force remount row A
      </button>
      <div id="rows-container">
        {rows.map((row) => (
          <Row
            key={row.id === 'row-a' ? `row-a-${rowAInstance}` : row.id}
            rowId={row.id}
            label={row.label}
          />
        ))}
      </div>
    </div>
  );
}

// Only render the rows (and therefore GuestUIFrame) once the extension is
// actually loaded - matching production, where CustomField is only chosen
// as a field's renderer after its extension is known. Mounting GuestUIFrame
// before `useHost()` resolves is a separate, pre-existing bug in
// GuestUIFrame itself (host starts null, then becomes truthy on the same
// instance, which skips its useEffect calls on the first render and trips
// React's "Rendered more hooks than during the previous render" - masked
// in every other e2e scenario by their use of key={Math.random()}, which
// forces a fresh instance every render). That's out of scope here.
function ReadyGate() {
  const { extensions = [], loading } = useExtensions(() => ({}));
  if (loading || extensions.length === 0) {
    return <p id="extensions-loading">Loading extension...</p>;
  }
  return <ReorderableList />;
}

export default function HostAppReorder() {
  return (
    <div>
      <h2>Multifield Reorder Scenario</h2>
      <Extensible debug={true} extensionsProvider={provider}>
        <ReadyGate />
      </Extensible>
    </div>
  );
}
