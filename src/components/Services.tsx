
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ScrollReveal from '@/components/ScrollReveal';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const Services = () => {
  const [openStates, setOpenStates] = React.useState<Record<number, boolean>>({});

  const services = [
    {
      title: "Awareness & Training",
      description: "Understanding AI potential and building foundational knowledge",
      icon: "🧠",
      features: [
        {
          title: "AI Readiness Workshops",
          description:
            "Interactive sessions that gauge your team's knowledge and uncover AI opportunities.",
        },
        {
          title: "Executive Briefings",
          description:
            "High-level overviews that help leadership grasp AI trends and strategic implications.",
        },
        {
          title: "Team Training Sessions",
          description:
            "Hands-on training that equips staff with practical skills to begin using AI tools effectively.",
        },
        {
          title: "Industry Use Case Analysis",
          description:
            "Deep dives into real-world AI success stories relevant to your sector for inspiration.",
        },
      ],
      pricing: "$750+",
    },
    {
      title: "Ability Building",
      description: "Setting up Microsoft 365 AI tools and building capabilities",
      icon: "🛠️",
      features: [
        {
          title: "M365 Copilot Setup",
          description:
            "Configure Microsoft 365 Copilot so employees can leverage AI within familiar tools.",
        },
        {
          title: "Power Platform Configuration",
          description:
            "Customize Power Platform components to automate workflows and connect data sources.",
        },
        {
          title: "Security & Compliance",
          description:
            "Ensure AI tooling meets security best practices and organizational compliance requirements.",
        },
        {
          title: "User Adoption Strategy",
          description:
            "Create plans and resources to drive enthusiastic and sustained use of new AI capabilities.",
        },
      ],
      pricing: "$3,500+",
    },
    {
      title: "Agent Development",
      description: "Custom AI agents tailored to your business processes",
      icon: "🤖",
      features: [
        {
          title: "Custom Agent Design",
          description:
            "Design agents around your workflows, defining optimal tasks and interactions.",
        },
        {
          title: "Integration Development",
          description:
            "Connect agents with internal systems and APIs for seamless data exchange.",
        },
        {
          title: "Testing & Optimization",
          description:
            "Validate and tune agent performance so it delivers reliable, high-quality results.",
        },
        {
          title: "Deployment & Support",
          description:
            "Roll out the agent to your environment and provide ongoing maintenance assistance.",
        },
      ],
      pricing: "$1000+",
    },
    {
      title: "Adoption Strategy",
      description: "Ongoing coaching and optimization for maximum ROI",
      icon: "📈",
      features: [
        {
          title: "Monthly Strategy Sessions",
          description:
            "Regular check-ins that refine your AI roadmap and address emerging opportunities.",
        },
        {
          title: "Performance Monitoring",
          description:
            "Track key metrics to measure impact and guide future improvements.",
        },
        {
          title: "Continuous Optimization",
          description:
            "Iteratively enhance workflows and models to maintain top-tier performance.",
        },
        {
          title: "Change Management",
          description:
            "Provide guidance and communication plans that smooth organization-wide transitions.",
        },
      ],
      pricing: "$500/month",
    },
  ];

  return (
    <section id="services" className="py-20 bg-white dark:bg-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-forest-green mb-4">
            Our Services
          </h2>
          <p className="text-lg sm:text-xl text-slate-gray max-w-3xl mx-auto">
            From initial awareness to full adoption, we guide your AI journey every step of the way
          </p>
        </ScrollReveal>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {services.map((service, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <Collapsible
                open={openStates[index] || false}
                onOpenChange={(open) => setOpenStates(prev => ({ ...prev, [index]: open }))}
              >
                <Card className="border-sage/30 hover:border-forest-green/50 transition-all duration-300 hover:shadow-lg group">
                <CardHeader>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="text-4xl">{service.icon}</div>
                    <div>
                      <CardTitle className="text-xl text-forest-green group-hover:text-earth-brown transition-colors">
                        {service.title}
                      </CardTitle>
                      <CardDescription className="text-slate-gray mt-1">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-2 text-slate-gray">
                        <div className="w-2 h-2 bg-sage rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium">{feature.title}</span>
                          <CollapsibleContent className="text-sm text-slate-gray/90 mt-1 overflow-hidden transition-all duration-300 ease-in-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                            {feature.description}
                          </CollapsibleContent>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-earth-brown">{service.pricing}</span>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-forest-green text-forest-green hover:bg-forest-green dark:hover:bg-[hsl(139_28%_25%)] hover:text-white transition-all duration-200"
                      >
                        {openStates[index] ? 'Show Less' : 'Learn More'}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardContent>
                </Card>
              </Collapsible>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA Section */}
        <ScrollReveal className="text-center bg-sage/10 dark:bg-slate-900 rounded-2xl p-8 sm:p-12">
          <h3 className="text-2xl sm:text-3xl font-bold text-forest-green mb-4">
            Ready to Transform Your Business?
          </h3>
          <p className="text-lg text-slate-gray mb-6 max-w-2xl mx-auto">
            Let's discuss how AI can help your business grow smarter while staying rooted in your values.
          </p>
          <Button
            asChild
            className="bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white px-8 py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg"
          >
            <a href="#contact">Cultivate Your Vision</a>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Services;
