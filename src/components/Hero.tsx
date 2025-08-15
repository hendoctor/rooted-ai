
import React from 'react';
import { Button } from '@/components/ui/button';
import heroPlantLight from '@/assets/hero-plants-light.jpg';
import heroPlantDark from '@/assets/hero-plants-dark.jpg';

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Photorealistic Plant Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-300"
        style={{
          backgroundImage: `url(${heroPlantLight})`,
        }}
      />
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-0 dark:opacity-100 transition-all duration-300"
        style={{
          backgroundImage: `url(${heroPlantDark})`,
        }}
      />
      
      {/* Smart Overlay System - 12% Light Mode, Perfect Dark Mode */}
      <div className="absolute inset-0 bg-gradient-to-br from-cream/88 via-cream/82 to-sage/72 dark:from-background/75 dark:via-background/65 dark:to-slate/50"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-cream/78 via-cream/58 to-transparent dark:from-background/60 dark:via-background/30 dark:to-transparent"></div>
      <div className="absolute inset-0 bg-forest-green/6 dark:bg-forest-green/6"></div>
      
      {/* Background Pattern (Enhanced) */}
      <div className="absolute inset-0 opacity-8 dark:opacity-4">
        <div className="absolute top-20 left-10 w-32 h-32 bg-forest-green/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-earth-brown/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-sage/20 rounded-full blur-xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-forest-green dark:text-white mb-6 animate-fade-in-up [text-shadow:_0_2px_8px_rgb(255_255_255_/_0.8)] dark:[text-shadow:_0_2px_8px_rgb(0_0_0_/_0.6)]">
            Grow Smarter.
            <br />
            <span className="text-earth-brown dark:text-sage">Stay Rooted.</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-gray dark:text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up [text-shadow:_0_1px_4px_rgb(255_255_255_/_0.9)] dark:[text-shadow:_0_1px_4px_rgb(0_0_0_/_0.5)]" style={{animationDelay: '0.2s'}}>
            Helping small businesses in Kansas City flourish with AI solutions built on Microsoft tools. 
            From awareness to adoption, we're your local growth partners.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <Button
              asChild
              className="bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white px-8 py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <a href="#contact">Get Started</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-earth-brown text-earth-brown hover:bg-earth-brown dark:hover:bg-[hsl(24_25%_38%)] hover:text-white px-8 py-3 text-lg rounded-lg transition-all duration-200"
            >
              <a href="#contact">Request Consultation</a>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-slate-gray/90 dark:text-muted-foreground animate-fade-in-up drop-shadow-sm" style={{animationDelay: '0.6s'}}>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-forest-green rounded-full shadow-sm"></div>
              <span>Local Kansas City Experts</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-earth-brown rounded-full shadow-sm"></div>
              <span>Experience Microsoft Developers</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-sage rounded-full shadow-sm"></div>
              <span>Small Business Focused</span>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
