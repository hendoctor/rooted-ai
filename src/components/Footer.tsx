
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIJokes } from '@/hooks/useAIJokes';
import FrequencySelector from '@/components/FrequencySelector';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { 
    isEnabled, 
    hasPermission, 
    isLoading, 
    frequency, 
    toggleJokes, 
    sendTestJoke, 
    updateFrequency, 
    getFrequencyDescription 
  } = useAIJokes();

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

          {/* AI Joke Notifications Section */}
          <div>
            <Card className="bg-slate-800/50 border-sage/20">
              <CardHeader>
                <CardTitle className="text-cream flex items-center gap-2">
                  🤖 AI Joke Machine
                </CardTitle>
                <CardDescription className="text-sage">
                  Enable this to get a funny AI joke every 5 minutes!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={toggleJokes}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="text-cream font-medium">
                      {isEnabled ? "AI Jokes Enabled" : "Enable AI Jokes"}
                    </span>
                  </div>
                  {hasPermission && (
                    <Button
                      onClick={sendTestJoke}
                      variant="outline"
                      size="sm"
                      className="text-sage border-sage/30 hover:bg-sage/10"
                    >
                      Send Joke Now
                    </Button>
                  )}
                </div>

                <FrequencySelector
                  frequency={frequency}
                  onFrequencyChange={updateFrequency}
                  disabled={isLoading || !isEnabled}
                />

                {isEnabled && (
                  <p className="text-sm text-sage bg-emerald-900/20 p-2 rounded border border-emerald-500/20">
                    ✅ AI Joke notifications are active! {getFrequencyDescription(frequency)}
                  </p>
                )}
              </CardContent>
            </Card>
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
