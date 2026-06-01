import { useState, useEffect } from 'react';
import { useExtensions, useHost } from '@adobe/uix-host-react';

export default function HostAppLoadFailure() {
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

  const { host } = useHost();
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    if (!host) return;
    const handler = () => setFailureCount(c => c + 1);
    host.addEventListener('error', handler);
    return () => host.removeEventListener('error', handler);
  }, [host]);

  return (
    <div>
      <h2>Load Failure Scenario</h2>
      <p id="extension-count">{extensions.length}</p>
      <p id="failure-count">{failureCount}</p>
    </div>
  );
}
