
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-gray dark:bg-slate-900 text-cream py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img 
                src="/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
                alt="RootedAI Logo" 
                className="w-8 h-8" 
              />
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
        </div>

        {/* Bottom Section */}
        <div className="border-t border-sage/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sage text-sm mb-4 md:mb-0">
            © {currentYear} RootedAI. All rights reserved. | Overland Park, KS
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
