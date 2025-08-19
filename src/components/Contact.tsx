
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuthReliable';
import ContactForm from '@/components/ContactForm';

const Contact = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterLoading(true);

    try {
      const { error } = await supabase.functions.invoke('newsletter-signup', {
        body: { email: newsletterEmail }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Successfully subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });

      setNewsletterEmail('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again later.";
      toast({
        title: "Subscription failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setNewsletterLoading(false);
    }
  };


  return (
    <section id="contact" className="py-20 bg-sage/5 dark:bg-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-forest-green mb-4">
            Get Rooted Today
          </h2>
          <p className="text-lg sm:text-xl text-slate-gray max-w-3xl mx-auto">
            Ready to explore how AI can help your business grow? Let's start the conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="border-sage/30 shadow-lg h-full flex flex-col">
            <CardHeader className="flex flex-col space-y-1.5 p-6 pb-0">
              <CardTitle className="text-2xl text-forest-green">Send us a message</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <ContactForm />
            </CardContent>
          </Card>

          {/* Contact Information & CTA */}
          <div className="space-y-8">
            {/* Contact Details */}
            <Card className="border-sage/30 dark:bg-slate-900 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-forest-green mb-6">Get in Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center">
                      <span className="text-forest-green">📧</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-gray">Email</p>
                      <p className="text-earth-brown">hello@rootedai.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center">
                      <span className="text-forest-green">📍</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-gray">Location</p>
                      <p className="text-earth-brown">Overland Park, Kansas</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center">
                      <span className="text-forest-green">⏰</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-gray">Response Time</p>
                      <p className="text-earth-brown">Within 1 hour</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule a Workshop */}
            <Card className="border-forest-green/30 bg-forest-green/5 dark:bg-slate-900 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-forest-green mb-4">
                  Ready for a Growth?
                </h3>
                <p className="text-slate-gray mb-6">
                  Skip the form and schedule a free 30-minute discovery call to discuss your AI readiness.
                </p>
                <Button className="bg-earth-brown dark:bg-[hsl(24_25%_38%)] hover:bg-earth-brown/90 dark:hover:bg-[hsl(24_25%_33%)] text-white px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-lg">
                  Schedule Discovery Session
                </Button>
              </CardContent>
            </Card>

            {/* Newsletter Signup */}
            <Card className="border-sage/30 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-forest-green mb-4">
                  Stay Updated
                </h3>
                <p className="text-slate-gray mb-4">
                  Stay rooted in the signal: 5 credible AI stories a day, distilled and easy to read.
                </p>
                
                 <form onSubmit={handleNewsletterSubmit} className="flex space-x-2">
                   <Input
                     type="email"
                     value={newsletterEmail}
                     onChange={(e) => setNewsletterEmail(e.target.value)}
                     placeholder="Your email"
                     required
                     className="border-sage/50 focus:border-forest-green"
                   />
                   <Button 
                     type="submit"
                     disabled={newsletterLoading}
                     className="bg-sage hover:bg-sage/80 text-slate-gray disabled:opacity-50"
                   >
                     {newsletterLoading ? 'Subscribing...' : 'Subscribe'}
                   </Button>
                 </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
