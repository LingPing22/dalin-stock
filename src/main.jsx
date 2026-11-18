import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LockScreen from './components/LockScreen.jsx'
import { DialogProvider } from './components/Dialogs.jsx'
import { initStore } from './lib/store.js'
import { initSecurity, useSecurity, isLocked, useAutoLock } from './lib/security.js'

/** Shows the lock screen instead of the app (nothing of the shop data stays on screen). */
function Gate() {
  const sec = useSecurity()
  useAutoLock()
  if (!sec.ready) return null
  if (isLocked(sec)) return <LockScreen />
  return (
    <DialogProvider>
      <App />
    </DialogProvider>
  )
}

const root = createRoot(document.getElementById('root'))

Promise.allSettled([initStore(), initSecurity()]).finally(() => {
  root.render(
    <StrictMode>
      <Gate />
    </StrictMode>,
  )
})
