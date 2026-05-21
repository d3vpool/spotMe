import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

if (import.meta.env.VITE_USE_MOCKS === 'true') {
  import('./mock/mockApi').then(() => {
    renderApp();
  });
} else {
  renderApp();
}
