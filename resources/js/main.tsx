import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/i18n' // Initialize i18next

// Import service worker registration for PWA
import './pwa'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)