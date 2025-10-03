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

const splash = document.getElementById('splash-screen');
if (splash) {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  if (isMobile) {
    // Allow the splash animation to play before removing
    setTimeout(() => splash.remove(), 1500);
  } else {
    splash.remove();
  }
}

// Register service worker in production for PWA capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Service worker registration failed:', err));
  });
}
