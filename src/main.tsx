import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from 'next-themes'
import './utils/securityEnhancer'
import './components/scripts/services-learn-more'

const root = createRoot(document.getElementById('root')!);

root.render(
  <ThemeProvider attribute="class" defaultTheme="light">
    <App />
  </ThemeProvider>
);

const splash = document.getElementById('splash-screen');
if (splash) {
  // Allow the splash animation to play before removing
  setTimeout(() => splash.remove(), 1500);
}
