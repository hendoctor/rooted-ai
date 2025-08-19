import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  contactFormSchema, 
  sanitizeForHTML, 
  rateLimitCheck, 
  generateCSRFToken, 
  storeCSRFToken, 
  getCSRFToken 
} from '@/utils/inputValidation';
import { z } from 'zod';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service_type: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    // Generate and store CSRF token on component mount
    const token = generateCSRFToken();
    storeCSRFToken(token);
    setCsrfToken(token);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: sanitizeForHTML(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!rateLimitCheck('contact_form', 3, 300000)) { // 3 requests per 5 minutes
      toast({
        title: "Rate Limited",
        description: "Too many submissions. Please wait before trying again.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate form data
      const validatedData = contactFormSchema.parse(formData);

      // Get current CSRF token
      const currentToken = getCSRFToken();
      if (!currentToken) {
        toast({
          title: "Security Error",
          description: "Security token missing. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      // Submit to Supabase edge function with CSRF protection
      const { data, error } = await supabase.functions.invoke('contact-form', {
        body: {
          ...validatedData,
          csrf_token: currentToken
        },
        headers: {
          'X-CSRF-Token': currentToken
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit form');
      }

      toast({
        title: "Message Sent!",
        description: "Thank you for your inquiry. We'll get back to you soon.",
      });

      // Reset form and generate new CSRF token
      setFormData({
        name: '',
        email: '',
        service_type: '',
        message: ''
      });
      
      const newToken = generateCSRFToken();
      storeCSRFToken(newToken);
      setCsrfToken(newToken);

    } catch (error) {
      console.error('Contact form error:', error);
      
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Submission Failed",
          description: "There was a problem sending your message. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex flex-col flex-1 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full"
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className="w-full"
              maxLength={254}
            />
          </div>
        </div>

        <div>
          <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-2">
            Service Interest
          </label>
          <Select value={formData.service_type} onValueChange={(value) => handleInputChange('service_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a service (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai-consultation">AI Consultation</SelectItem>
              <SelectItem value="automation">Process Automation</SelectItem>
              <SelectItem value="analytics">Data Analytics</SelectItem>
              <SelectItem value="training">AI Training</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 flex flex-col">
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message *
          </label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            required
            className="w-full flex-1 min-h-[150px] resize-none"
            placeholder="Tell us about your project or how we can help..."
            maxLength={5000}
          />
          <div className="text-sm text-gray-500 mt-1">
            {formData.message.length}/5000 characters
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-forest-green hover:bg-forest-green/90 mt-6"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
};

export default ContactForm;