import React from 'react'
import ReactDOM from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import App from './App.tsx'
import './index.css'

// ─── Monaco: use locally bundled version ──────────────────────────────────
// Prevents @monaco-editor/react from loading Monaco from CDN (which is
// blocked in Electron). Workers are resolved automatically by Monaco
// using import.meta.url, which works correctly with our app:// protocol.
loader.config({ monaco })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
