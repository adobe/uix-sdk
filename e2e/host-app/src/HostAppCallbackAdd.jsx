import { Extensible, useExtensions } from '@adobe/uix-host-react';

// Provider returns only ext-1 (port 3002).
// extensionsListCallback always injects ext-2 (port 3003).
const provider = async () => ({
  'ext-1': { id: 'ext-1', url: 'http://localhost:3002#/register?id=ext-1' },
});

const addExtension = (exts) => ({
  ...exts,
  'ext-2': { id: 'ext-2', url: 'http://localhost:3003#/register?id=ext-2' },
});

function CallbackContent() {
  const { extensions = [] } = useExtensions(() => ({
    requires: { extensionNamespace: ['getMessage'] },
  }));
  return (
    <div>
      <p id="extension-count">{extensions.length}</p>
      <ul id="extension-ids">
        {extensions.map((ext) => (
          <li key={ext.id} data-extension-id={ext.id}>{ext.id}</li>
        ))}
      </ul>
    </div>
  );
}

export default function HostAppCallbackAdd() {
  return (
    <div>
      <h2>Extensions List Callback — Add Scenario</h2>
      <Extensible debug={true} extensionsProvider={provider} extensionsListCallback={addExtension}>
        <CallbackContent />
      </Extensible>
    </div>
  );
}
