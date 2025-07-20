
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    serviceType: ''
  });
  const [loading, setLoading] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('contact-form', {
        body: {
          name: formData.name,
          email: formData.email,
          message: formData.message,
          serviceType: formData.serviceType
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 2 hours.",
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        message: '',
        serviceType: ''
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again later.";
      toast({
        title: "Failed to send message",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <section id="contact" className="py-20 bg-sage/5 dark:bg-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-forest-green mb-4">
            Get Started Today
          </h2>
          <p className="text-lg sm:text-xl text-slate-gray max-w-3xl mx-auto">
            Ready to explore how AI can help your business grow? Let's start the conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="border-sage/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-forest-green">Send us a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-gray mb-2">
                    Full Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-gray mb-2">
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="your.email@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="serviceType" className="block text-sm font-medium text-slate-gray mb-2">
                    Service Interest
                  </label>
                  <Select onValueChange={(value) => handleInputChange('serviceType', value)}>
                    <SelectTrigger className="border-sage/50 focus:border-forest-green">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awareness">Training & Awareness</SelectItem>
                      <SelectItem value="ability">AI Environment Setup </SelectItem>
                      <SelectItem value="agent">Agent Development</SelectItem>
                      <SelectItem value="adoption">Adoption Strategy</SelectItem>
                      <SelectItem value="consultation">General Consultation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-gray mb-2">
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    required
                    rows={5}
                    className="border-sage/50 focus:border-forest-green resize-none"
                    placeholder="Tell us about your business and how we can help..."
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
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
                      <p className="text-earth-brown">Within 2 hours</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule a Workshop */}
            <Card className="border-forest-green/30 bg-forest-green/5 dark:bg-slate-900 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-forest-green mb-4">
                  Ready for a Workshop?
                </h3>
                <p className="text-slate-gray mb-6">
                  Skip the form and schedule a free 30-minute discovery call to discuss your AI readiness.
                </p>
                <Button className="bg-earth-brown dark:bg-[hsl(24_25%_38%)] hover:bg-earth-brown/90 dark:hover:bg-[hsl(24_25%_33%)] text-white px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-lg">
                  Schedule Discovery Call
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
                  Get AI tips, local business insights, and workshop announcements.
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
