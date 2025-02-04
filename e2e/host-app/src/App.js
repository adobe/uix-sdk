import { Extensible } from '@adobe/uix-host-react'
import HostApp from './HostApp';

function App() {
  const extension = {
    "id": "extensionId",
    "url": "http://localhost:3002#/register",
  };

  const provider = async () => ({
      [extension.id]: extension,
  });

  return (
    <>
      <div>
        <h1>Tests</h1>
        <Extensible
          debug={true}
          extensionsProvider={provider}>
          <HostApp />
        </Extensible>
      </div>
    </>
  )
}

export default App