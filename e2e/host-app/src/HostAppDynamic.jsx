import { useState, useCallback } from 'react';
import { Extensible, useExtensions } from '@adobe/uix-host-react';

const provider = async () => ({
  extensionId: { id: 'extensionId', url: 'http://localhost:3002#/register' },
});

const useExtensionsOpts = () => ({
  requires: { extensionNamespace: ['getMessage', 'setMessage'] },
  provides: {
    hostNamespace: { getHostInfo: () => 'Message from the host to guest!' },
  },
});

function DynamicContent() {
  const { extensions = [] } = useExtensions(useExtensionsOpts);

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

export default function HostAppDynamic() {
  const [addDynamic, setAddDynamic] = useState(false);

  const extensionsListCallback = useCallback(
    (exts) => {
      if (!addDynamic) return exts;
      return {
        ...exts,
        'ext-dynamic': {
          id: 'ext-dynamic',
          url: 'http://localhost:3002#/register?id=ext-dynamic',
        },
      };
    },
    [addDynamic]
  );

  return (
    <div>
      <h2>Dynamic Extension Scenario</h2>
      <Extensible
        debug={true}
        extensionsProvider={provider}
        extensionsListCallback={extensionsListCallback}
      >
        <DynamicContent />
      </Extensible>
      <button id="add-extension-button" onClick={() => setAddDynamic(true)}>
        Add Extension
      </button>
    </div>
  );
}
