import { useState } from 'react';
import { useExtensions, GuestUIFrame } from '@adobe/uix-host-react';

import './App.css'

export default function Component() {
  const [extensionMsg, setExtensionMsg] = useState('');

  const { extensions = {} } = useExtensions(() => ({
        requires: {
            extensionNamespace: ["getMessage", "setMessage"]
        },
        provides: {
            hostNamespace: {
                getHostInfo: () => {
                    return `Message from the host to guest!`;
                },
            },
        }
  }));

  const apiInteraction = () => {
    const extension = extensions[0];
    if (extension) {
      extension.apis.extensionNamespace.getMessage().then(info => {
        setExtensionMsg(info);
      });
    }
  };

  const msgInGuest = () => {
    const extension = extensions[0];
    if (extension) {
      extension.apis.extensionNamespace.setMessage('Message from host');
    }
  };

  return (
    <>
      <div>
          <div className="message-box">
            <h2>Test 1: Print message from guest after button click</h2>
            <button id="get-guest-message-button" className="button" onClick={() => apiInteraction()}>
              Get message
            </button>
            <p>Result</p>
            <p id="get-guest-message-result">{extensionMsg}</p>
          </div>
          <div className="message-box">
            <h2>Test 2: Add message to the guest app</h2>
            <button className="button" id="set-message-from-host" onClick={() => msgInGuest()}>
              Set message
            </button>
            
            {extensions[0] && (
              <div className="iframe-wrapper">
                <GuestUIFrame
                  id="iframe-for-guest"
                  key={Math.random()}
                  guestId={extensions[0].id}
                  src={extensions[0].url.href ? extensions[0].url.href.replace('register', '') : ''}
                />
              </div>
              
            )}
          </div>
          
      </div>
    </>
  );
}
