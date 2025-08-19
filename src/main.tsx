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
