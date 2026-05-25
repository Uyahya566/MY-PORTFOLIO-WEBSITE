import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const logError = (msg: string) => {
  fetch('http://localhost:5000/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  }).catch(() => {});
};
window.addEventListener('error', (e) => logError(e.message));
window.addEventListener('unhandledrejection', (e) => logError(e.reason?.toString() || 'Promise Rejection'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
