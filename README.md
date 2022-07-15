# @adobe/uix-sdk

## UI Extensibility toolkit for Experience Cloud Apps

With these libraries you can:

- Make any app into a UI Extensibility **Host**
- Connect any app to a Host as a UI Extension, or **Guest**


### Installation

```sh
npm install penpal @adobe/uix-sdk
```

```tsx
import { Extensible, useExtensions } from '@adobe/uix-sdk/react'

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
