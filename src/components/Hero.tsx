import React from 'react';
import { Button } from '@/components/ui/button';
import RootedBackground from '@/components/RootedBackground';

const Hero = () => {
  return (
    <section id="home">
      <RootedBackground>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center h-full flex items-center justify-center">
          <div className="max-w-4xl mx-auto">
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-forest-green dark:text-white mb-6 animate-spring-up [text-shadow:_0_2px_8px_rgb(255_255_255_/_0.8)] dark:[text-shadow:_0_2px_8px_rgb(0_0_0_/_0.6)]">
              Grow Smarter.
              <br />
              <span className="text-earth-brown dark:text-sage">Stay Rooted.</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-gray dark:text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed animate-spring-up-delayed [text-shadow:_0_1px_4px_rgb(255_255_255_/_0.9)] dark:[text-shadow:_0_1px_4px_rgb(0_0_0_/_0.5)]">
              Helping small businesses flourish with AI solutions built on Microsoft tools.
              From awareness to adoption, we're your local growth partners.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-elastic-in-delayed">
              <Button
                asChild
                className="button-energy bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white px-8 py-3 text-lg rounded-lg glow-on-hover"
              >
                <a href="#contact">Get Started</a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="button-energy border-earth-brown text-earth-brown hover:bg-earth-brown dark:hover:bg-[hsl(24_25%_38%)] hover:text-white px-8 py-3 text-lg rounded-lg"
              >
                <a href="#contact">Grow With Us</a>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-slate-gray/90 dark:text-muted-foreground animate-slide-up-delayed-3 drop-shadow-sm">
              <div className="flex items-center space-x-2 interactive-scale">
                <div className="w-4 h-4 bg-forest-green rounded-full shadow-sm animate-glow-pulse"></div>
                <span>Local Kansas City Experts</span>
              </div>
              <div className="flex items-center space-x-2 interactive-scale">
                <div className="w-4 h-4 bg-earth-brown rounded-full shadow-sm animate-glow-pulse" style={{ animationDelay: '0.3s' }}></div>
                <span>Experienced Microsoft Developers</span>
              </div>
              <div className="flex items-center space-x-2 interactive-scale">
                <div className="w-4 h-4 bg-sage rounded-full shadow-sm animate-glow-pulse" style={{ animationDelay: '0.6s' }}></div>
                <span>Small Business Focused</span>
              </div>
            </div>
          </div>
        </div>
      </RootedBackground>
    </section>
  );
};

export default Hero;
