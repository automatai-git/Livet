import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { IconSprite } from './components/AppIcon.jsx'
import { initInstallPrompt } from './lib/installPrompt.js'
import './index.css'

// Capture `beforeinstallprompt` before React mounts — the You tab's
// "Install on home screen" row consumes it later.
initInstallPrompt()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <IconSprite />
    <App />
  </React.StrictMode>,
)
