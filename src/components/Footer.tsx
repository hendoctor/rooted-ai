
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-gray text-cream py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-sage rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-cream rounded-full relative">
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-3 bg-cream rounded-t-full"></div>
                </div>
              </div>
              <span className="text-2xl font-bold text-cream">RootedAI</span>
            </div>
            <p className="text-sage mb-4 max-w-md">
              Helping Kansas City small businesses grow smarter with AI solutions built on Microsoft tools. 
              Local expertise, trusted partnerships, sustainable growth.
            </p>
            <p className="text-lg font-semibold text-sage">
              Grow Smarter. Stay Rooted.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-cream mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#home" className="text-sage hover:text-cream transition-colors">Home</a></li>
              <li><a href="#about" className="text-sage hover:text-cream transition-colors">About</a></li>
              <li><a href="#services" className="text-sage hover:text-cream transition-colors">Services</a></li>
              <li><a href="#team" className="text-sage hover:text-cream transition-colors">Team</a></li>
              <li><a href="#contact" className="text-sage hover:text-cream transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-lg font-semibold text-cream mb-4">Connect</h4>
            <div className="space-y-3">
              <a
                href="#"
                className="flex items-center space-x-2 text-sage hover:text-cream transition-colors"
              >
                <div className="w-6 h-6 bg-sage/20 rounded flex items-center justify-center">
                  <span className="text-xs">in</span>
                </div>
                <span>LinkedIn</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 text-sage hover:text-cream transition-colors"
              >
                <div className="w-6 h-6 bg-sage/20 rounded flex items-center justify-center">
                  <span className="text-xs">gh</span>
                </div>
                <span>GitHub</span>
              </a>
              <a
                href="mailto:hello@rootedai.com"
                className="flex items-center space-x-2 text-sage hover:text-cream transition-colors"
              >
                <div className="w-6 h-6 bg-sage/20 rounded flex items-center justify-center">
                  <span className="text-xs">@</span>
                </div>
                <span>Email</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-sage/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sage text-sm mb-4 md:mb-0">
            © {currentYear} RootedAI. All rights reserved. | Kansas City, MO
          </div>
          <div className="flex space-x-6 text-sm">
            <a href="#" className="text-sage hover:text-cream transition-colors">Privacy Policy</a>
            <a href="#" className="text-sage hover:text-cream transition-colors">Terms of Service</a>
            <a href="#" className="text-sage hover:text-cream transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
