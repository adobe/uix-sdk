import { useState } from 'react';
import { useExtensions } from '@adobe/uix-host-react';

export default function HostAppMulti() {
  const [messages, setMessages] = useState([]);

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

  const getAllMessages = async () => {
    const msgs = await Promise.all(
      extensions.map((ext) => ext.apis.extensionNamespace.getMessage())
    );
    setMessages(msgs);
  };

  return (
    <div>
      <h2>Multi Extension Scenario</h2>
      <p id="extension-count">{extensions.length}</p>
      <button id="get-all-messages" onClick={getAllMessages}>
        Get All Messages
      </button>
      <div id="all-messages">
        {messages.map((msg, i) => (
          <p key={i} className="ext-message">
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}
