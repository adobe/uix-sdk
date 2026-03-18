import { useExtensions } from '@adobe/uix-host-react';

export default function HostAppRequires() {
  const { extensions = [] } = useExtensions(() => ({
    requires: {
      extensionNamespace: ['getMessage', 'setMessage'],
    },
    provides: {
      hostNamespace: {
        getHostInfo: () => 'Message from the host to guest!',
      },
    },
  }));

  return (
    <div>
      <h2>Requires Enforcement Scenario</h2>
      <p id="extension-count">{extensions.length}</p>
    </div>
  );
}
