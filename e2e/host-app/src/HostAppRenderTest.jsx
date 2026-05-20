import React, { useRef, useState } from 'react';
import { Extensible, ExtensibleWrapper, useExtensions } from '@adobe/uix-host-react';

const outerStyle     = { fontFamily: 'monospace', background: '#e2e3e5', padding: '4px 8px', marginBottom: '2px' };
const containerStyle = { fontFamily: 'monospace', background: '#fff3cd', padding: '4px 8px', marginBottom: '2px' };
const mainStyle      = { fontFamily: 'monospace', background: '#cce5ff', padding: '4px 8px', marginBottom: '2px' };
const slotStyle      = { fontFamily: 'monospace', background: '#d4edda', padding: '4px 8px', marginBottom: '8px' };

// Module-level mount counters — survive component unmount/remount so we can detect when
// React discards and recreates an instance (e.g. due to Fragment→Provider tree switch).
const mountCounts = {};
function useMountId(key) {
  const id = useRef(null);
  if (id.current === null) {
    mountCounts[key] = (mountCounts[key] || 0) + 1;
    id.current = mountCounts[key];
  }
  return id.current;
}

function OuterPanel({ label, idPrefix, children }) {
  const renders = useRef(0);
  renders.current++;
  const mount = useMountId(`${idPrefix}-outer`);
  return (
    <div style={{ border: '1px solid #999', padding: 8, marginBottom: 8 }}>
      <p style={outerStyle}>
        {label} outer panel (no extensions): mount <strong>#{mount}</strong> render <strong id={`${idPrefix}-outer-renders`}>{renders.current}</strong>
      </p>
      {children}
    </div>
  );
}

function MainDisplay({ label, idPrefix }) {
  const renders = useRef(0);
  renders.current++;
  const mount = useMountId(`${idPrefix}-main`);
  return (
    <p style={mainStyle}>
      {label} main display (no extensions): mount <strong>#{mount}</strong> render <strong id={`${idPrefix}-main-renders`}>{renders.current}</strong>
    </p>
  );
}

function ExtensionSlot({ extensions, loading, label, idPrefix }) {
  const renders = useRef(0);
  renders.current++;
  const mount = useMountId(`${idPrefix}-slot`);
  return (
    <p style={slotStyle}>
      {label} extension slot: mount <strong>#{mount}</strong> render <strong id={`${idPrefix}-slot-renders`}>{renders.current}</strong>
      &nbsp;| extensions: <span id={`${idPrefix}-count`}>{extensions.length}</span>
      &nbsp;| loading: <span id={`${idPrefix}-loading`}>{String(loading)}</span>
    </p>
  );
}

function ExtensionsContainer({ label, idPrefix }) {
  const renders = useRef(0);
  renders.current++;
  const mount = useMountId(`${idPrefix}-container`);

  const { extensions, loading } = useExtensions(() => ({
    updateOn: 'each',
    requires: { extensionNamespace: ['getMessage'] },
  }));

  return (
    <>
      <p style={containerStyle}>
        {label} container (useExtensions): mount <strong>#{mount}</strong> render <strong id={`${idPrefix}-container-renders`}>{renders.current}</strong>
      </p>
      <ExtensionSlot extensions={extensions} loading={loading} label={label} idPrefix={idPrefix} />
    </>
  );
}

const extensionsProvider = () =>
  new Promise(resolve =>
    setTimeout(() => resolve({
      extensionId: { id: 'extensionId', url: 'http://localhost:3002#/register' },
    }), 2000)
  );

function injectMockExtension(exts) {
  return { ...exts, 'mock-ext': { id: 'mock-ext', url: 'http://localhost:3002#/register' } };
}

const STUB_AUTH = { imsToken: '', imsOrg: '', apiKey: '' };

function onRender(id, phase, actualDuration) {
  console.log(`[Profiler] ${id} — ${phase} — ${actualDuration.toFixed(2)}ms`);
}

export default function HostAppRenderTest() {
  const renders = useRef(0);
  renders.current++;
  const [tick, setTick] = useState(0);

  return (
    <div style={{ padding: 16 }}>
      <h2>Re-render Test</h2>
      <p style={{ fontFamily: 'monospace', padding: '4px 8px', marginBottom: '4px' }}>
        HostAppRenderTest (page root): render <strong id="parent-renders">{renders.current}</strong>
      </p>
      <button id="force-rerender" onClick={() => setTick(t => t + 1)} style={{ marginBottom: 16 }}>
        Force parent re-render (tick: {tick})
      </button>

      <h3>Panel A — Extensible (direct)</h3>
      <React.Profiler id="Extensible" onRender={onRender}>
        <Extensible debug extensionsProvider={extensionsProvider}>
          <OuterPanel label="Panel A" idPrefix="panelA">
            <MainDisplay label="Panel A" idPrefix="panelA" />
            <ExtensionsContainer label="Panel A" idPrefix="panelA" />
          </OuterPanel>
        </Extensible>
      </React.Profiler>

      <h3>Panel B — ExtensibleWrapper (stub auth, mock extension injected)</h3>
      <React.Profiler id="ExtensibleWrapper" onRender={onRender}>
        <ExtensibleWrapper
          debug
          appName="render-test"
          service="render-test"
          extensionPoint="test"
          version="1"
          authConfig={STUB_AUTH}
          disableExtensionManager={false}
          extensionsListCallback={injectMockExtension}
        >
          <OuterPanel label="Panel B" idPrefix="panelB">
            <MainDisplay label="Panel B" idPrefix="panelB" />
            <ExtensionsContainer label="Panel B" idPrefix="panelB" />
          </OuterPanel>
        </ExtensibleWrapper>
      </React.Profiler>
    </div>
  );
}
