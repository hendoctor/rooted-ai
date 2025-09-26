import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  goal?: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
  isDemo?: boolean;
}

const FAQSection: React.FC<FAQSectionProps> = ({ faqs, isDemo = false }) => {
  if (!faqs || faqs.length === 0) {
    return null;
  }

  // Group FAQs by category if available
  const groupedFAQs = faqs.reduce((acc, faq) => {
    const category = faq.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  const categories = Object.keys(groupedFAQs);
  const themeClasses = isDemo 
    ? 'text-primary border-primary/20 bg-primary/10' 
    : 'text-forest-green border-forest-green/20 bg-forest-green/10';

  return (
    <div className="animate-slide-up-delayed-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-2xl font-semibold ${isDemo ? 'text-primary' : 'text-forest-green'}`}>
          Frequently Asked Questions
        </h2>
        <Badge 
          variant="outline" 
          className={isDemo ? 'text-primary border-primary/20' : 'text-forest-green border-forest-green/20'}
        >
          {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card className={`${isDemo ? 'border-primary/20' : 'border-forest-green/20'} animate-fade-in`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDemo ? 'text-primary' : 'text-forest-green'}`}>
            <HelpCircle className="h-5 w-5" />
            Help & Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full space-y-2">
            {categories.map((category) => (
              <div key={category} className="space-y-2">
                {categories.length > 1 && (
                  <div className="pt-4 first:pt-0">
                    <Badge 
                      variant="secondary" 
                      className={themeClasses}
                    >
                      {category}
                    </Badge>
                  </div>
                )}
                {groupedFAQs[category].map((faq, index) => (
                  <AccordionItem 
                    key={faq.id || `${category}-${index}`} 
                    value={`faq-${category}-${index}`}
                    className="border rounded-lg px-4 hover:shadow-sm transition-shadow"
                  >
                    <AccordionTrigger className={`text-left hover:no-underline ${isDemo ? 'hover:text-primary' : 'hover:text-forest-green'}`}>
                      <div className="flex-1 pr-4">
                        <div className="font-medium text-base">{faq.question}</div>
                        {faq.goal && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Goal: {faq.goal}
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 pb-4">
                      <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {faq.answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </div>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default FAQSection;