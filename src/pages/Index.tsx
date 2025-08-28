
import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Services from '@/components/Services';
import Reviews from '@/components/Reviews';
import Team from '@/components/Team';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import PWAUpdateNotification from '@/components/PWAUpdateNotification';
import PublicAnnouncements from '@/components/PublicAnnouncements';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Reviews />
        <Team />
        <PublicAnnouncements />
        <Contact />
      </main>
      <Footer />
      <PWAUpdateNotification />
    </div>
  );
};

export default Index;
