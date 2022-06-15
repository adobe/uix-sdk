# uix-sdk

```sh
npm install penpal @adobe/uix-sdk
```

```tsx
import { Extensible, useDataSources } from '@adobe/uix-sdk/dist/react'

function ExtensibleApp() {
  return (
    <Extensible><App/></Extensible>
  )
}

function App() {
  const results = useDataSources<Query,Result>({ blockId: 'my-app-editor', query: 'searchString' });
  return (
    <ul>
        {results.map(result, i) => (
          <li key={i}>{`${result.source}: ${result.data}`</li>
        )}
    </ul>
}

```
