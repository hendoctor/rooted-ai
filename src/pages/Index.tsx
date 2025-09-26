
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Services from '@/components/Services';
import Reviews from '@/components/Reviews';
import Team from '@/components/Team';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import PWAUpdateNotification from '@/components/PWAUpdateNotification';

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const scrollToHash = () => {
      const hash = (window.location.hash || '').replace('#', '');
      if (!hash) {
        return;
      }

      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Retry shortly in case the section has not mounted yet
        setTimeout(scrollToHash, 50);
      }
    };

    const handleLoad = () => {
      if (window.location.hash) {
        scrollToHash();
      }
    };

    if (window.location.hash) {
      // Allow the page to finish rendering before attempting to scroll
      setTimeout(scrollToHash, 0);
    }

    window.addEventListener('hashchange', scrollToHash);
    window.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('hashchange', scrollToHash);
      window.removeEventListener('load', handleLoad);
    };
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Reviews />
        <Team />
        <Contact />
      </main>
      <Footer />
      <PWAUpdateNotification />
    </div>
  );
};

export default Index;
