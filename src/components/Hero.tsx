
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-cream to-sage/20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-forest-green rounded-full"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-earth-brown rounded-full"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-sage rounded-full"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-forest-green mb-6 animate-fade-in-up">
            Grow Smarter.
            <br />
            <span className="text-earth-brown">Stay Rooted.</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-gray mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            Helping small businesses in Kansas City flourish with AI solutions built on Microsoft tools. 
            From awareness to adoption, we're your local growth partners.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <Button className="bg-forest-green hover:bg-forest-green/90 text-white px-8 py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105">
              Get Started
            </Button>
            <Button variant="outline" className="border-earth-brown text-earth-brown hover:bg-earth-brown hover:text-white px-8 py-3 text-lg rounded-lg transition-all duration-200">
              Request Consultation
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-slate-gray/80 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-forest-green rounded-full"></div>
              <span>Local Kansas City Experts</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-earth-brown rounded-full"></div>
              <span>Experience Microsoft Developers</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-sage rounded-full"></div>
              <span>Small Business Focused</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex flex-col items-center space-y-1">
          <ChevronDown 
            size={24} 
            style={{ color: '#2d5239' }}
            className="animate-bounce"
          />
          <ChevronDown 
            size={24} 
            className="animate-bounce"
            style={{ color: '#2d5239', animationDelay: '0.2s' }}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
