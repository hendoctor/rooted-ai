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
  return (
    <div className="animate-slide-up-delayed-5" data-demo={isDemo ? 'true' : 'false'}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Frequently Asked Questions
        </h2>
        <Badge
          variant="outline"
          className="text-forest-green border-forest-green/30 bg-forest-green/5"
        >
          {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card className="border-forest-green/20 animate-fade-in">
        <CardContent className="pt-6">
          <Accordion type="multiple" className="w-full space-y-4">
            {categories.map(category => (
              <div key={category} className="space-y-2">
                <AccordionItem
                  value={`category-${category}`}
                  className="border rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-forest-green/40"
                >
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <HelpCircle className="h-5 w-5 text-forest-green" />
                      <span className="font-semibold text-lg">{category}</span>
                      <Badge
                        variant="secondary"
                        className="ml-2 text-forest-green border-forest-green/30 bg-forest-green/10"
                      >
                        {groupedFAQs[category].length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <Accordion type="multiple" className="w-full space-y-2">
                      {groupedFAQs[category].map((faq, index) => (
                        <AccordionItem
                          key={faq.id || `${category}-${index}`}
                          value={`faq-${category}-${index}`}
                          className="border rounded-lg px-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-forest-green/40"
                        >
                          <AccordionTrigger className="text-left hover:no-underline">
                            <div className="flex-1 pr-4">
                              <div className="font-medium text-base text-slate-900 dark:text-white">{faq.question}</div>
                              {faq.goal && (
                                <div className="text-sm text-forest-green mt-1">
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
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              </div>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default FAQSection;
