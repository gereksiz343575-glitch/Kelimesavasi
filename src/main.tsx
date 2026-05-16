import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.onerror = function(message, source, lineno, colno, error) {
  const rootObj = document.getElementById('root');
  if (rootObj && rootObj.innerHTML === '') {
     rootObj.innerHTML = `<div style="color:red; padding:20px; font-family:sans-serif; text-align:left;">
       <h3>Başlangıçta bir hata oluştu (Error)</h3>
       <p>Mesaj: ${message}</p>
       <p>Kaynak: ${source}:${lineno}:${colno}</p>
       <pre>${error?.stack}</pre>
     </div>`;
  }
};

window.addEventListener('unhandledrejection', function(event) {
  const rootObj = document.getElementById('root');
  if (rootObj && rootObj.innerHTML === '') {
     rootObj.innerHTML = `<div style="color:red; padding:20px; font-family:sans-serif; text-align:left;">
       <h3>Bir asenkron işlem başarısız oldu (Promise Rejection)</h3>
       <p>Neden: ${event.reason?.message || event.reason}</p>
       <pre>${event.reason?.stack}</pre>
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

