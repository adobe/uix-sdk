import { Extensible } from '@adobe/uix-host-react'
import HostApp from './HostApp';
import HostAppLoadFailure from './HostAppLoadFailure';
import HostAppMulti from './HostAppMulti';
import HostAppRequires from './HostAppRequires';
import HostAppDynamic from './HostAppDynamic';
import HostAppCallbackAdd from './HostAppCallbackAdd';

function getScenario() {
  const hash = window.location.hash;
  if (hash.startsWith('#/load-failure')) return 'load-failure';
  if (hash.startsWith('#/multi')) return 'multi';
  if (hash.startsWith('#/requires')) return 'requires';
  if (hash.startsWith('#/dynamic')) return 'dynamic';
  if (hash.startsWith('#/callback-add')) return 'callback-add';
  return 'default';
}

const providers = {
  default: async () => ({
    extensionId: { id: 'extensionId', url: 'http://localhost:3002#/register' },
  }),
  'load-failure': async () => ({
    'ext-live': { id: 'ext-live', url: 'http://localhost:3002#/register?id=ext-live' },
    'ext-dead': { id: 'ext-dead', url: 'http://localhost:9999#/register' },
  }),
  multi: async () => ({
    'ext-1': { id: 'ext-1', url: 'http://localhost:3002#/register?id=ext-1' },
    'ext-2': { id: 'ext-2', url: 'http://localhost:3003#/register?id=ext-2' },
  }),
  requires: async () => ({
    'ext-full': { id: 'ext-full', url: 'http://localhost:3002#/register?id=ext-full' },
    'ext-partial': { id: 'ext-partial', url: 'http://localhost:3002#/register-partial' },
  }),
};

const components = {
  default: HostApp,
  'load-failure': HostAppLoadFailure,
  multi: HostAppMulti,
  requires: HostAppRequires,
};

function App() {
  const scenario = getScenario();

  if (scenario === 'dynamic') {
    return <HostAppDynamic />;
  }

  if (scenario === 'callback-add') {
    return <HostAppCallbackAdd />;
  }

  const Component = components[scenario];
  const provider = providers[scenario];

  return (
    <div>
      <h1>Tests</h1>
      <Extensible debug={true} extensionsProvider={provider}>
        <Component />
      </Extensible>
    </div>
  );
}

export default App
