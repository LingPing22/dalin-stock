import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DialogProvider } from './components/Dialogs.jsx'
import { initStore } from './lib/store.js'

const root = createRoot(document.getElementById('root'))

initStore()
  .catch(() => null)
  .finally(() => {
    root.render(
      <StrictMode>
        <DialogProvider>
          <App />
        </DialogProvider>
      </StrictMode>,
    )
  })
