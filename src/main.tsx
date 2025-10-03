import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from 'next-themes'
import './utils/securityEnhancer'
import { setupSecurityMonitoring } from './utils/securityHeaders'

// Apply security monitoring only (headers should be set at HTTP level)
setupSecurityMonitoring();

const root = createRoot(document.getElementById('root')!);

root.render(
  <ThemeProvider attribute="class" defaultTheme="light">
    <App />
  </ThemeProvider>
);

const finalizeLaunch = () => {
  document.body.classList.add('app-loaded');

  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  const removeSplash = () => {
    splash.removeEventListener('transitionend', removeSplash);
    if (splash.parentElement) {
      splash.parentElement.removeChild(splash);
    }
  };

  requestAnimationFrame(() => {
    splash.setAttribute('data-state', 'hidden');
    splash.addEventListener('transitionend', removeSplash, { once: true });
    window.setTimeout(removeSplash, 800);
  });
};

if (document.readyState === 'complete') {
  finalizeLaunch();
} else {
  window.addEventListener('load', finalizeLaunch, { once: true });
}

// Register service worker in production for PWA capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Service worker registration failed:', err));
  });
}
