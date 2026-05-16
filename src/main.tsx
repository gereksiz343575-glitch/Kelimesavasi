import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (e) => {
  console.error("Global error:", e.error);
  const rootObj = document.getElementById('root');
  if (rootObj && rootObj.innerHTML === '') {
     rootObj.innerHTML = `<div style="color:red; padding:20px; font-family:sans-serif;">
       <h3>Uygulamada bir hata oluştu</h3>
       <pre>${e.error?.message || e.message}</pre>
     </div>`;
  }
});

// Suppress known deprecation warnings from Three.js that are triggered internally by React Three Fiber
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

