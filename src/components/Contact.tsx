
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    serviceType: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <section id="contact" className="py-20 bg-sage/5">
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
                  className="w-full bg-forest-green hover:bg-forest-green/90 text-white py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information & CTA */}
          <div className="space-y-8">
            {/* Contact Details */}
            <Card className="border-sage/30 shadow-lg">
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
            <Card className="border-forest-green/30 bg-forest-green/5 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-forest-green mb-4">
                  Ready for a Workshop?
                </h3>
                <p className="text-slate-gray mb-6">
                  Skip the form and schedule a free 30-minute discovery call to discuss your AI readiness.
                </p>
                <Button className="bg-earth-brown hover:bg-earth-brown/90 text-white px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-lg">
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
                <div className="flex space-x-2">
                  <Input
                    type="email"
                    placeholder="Your email"
                    className="border-sage/50 focus:border-forest-green"
                  />
                  <Button className="bg-sage hover:bg-sage/80 text-slate-gray">
                    Subscribe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
