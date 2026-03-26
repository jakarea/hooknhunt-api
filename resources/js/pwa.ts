/**
 * PWA Service Worker Registration
 * This file handles the registration of the service worker for offline support
 */

import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload to update?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
  },
  onRegistered(registration) {

    // Check for updates every hour
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onRegisterError(error) {
    console.error('❌ PWA: Service worker registration failed', error)
  }
})

export { updateSW }
