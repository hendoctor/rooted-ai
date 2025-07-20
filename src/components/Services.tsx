
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const Services = () => {
  const { elementRef, isVisible } = useScrollAnimation({
    hapticPattern: [30, 50, 30]
  });

  const services = [
    {
      title: "Awareness & Training",
      description: "Understanding AI potential and building foundational knowledge",
      icon: "🧠",
      features: [
        "AI Readiness Workshops",
        "Executive Briefings",
        "Team Training Sessions",
        "Industry Use Case Analysis"
      ],
      pricing: "$750+"
    },
    {
      title: "Ability Building",
      description: "Setting up Microsoft 365 AI tools and building capabilities",
      icon: "🛠️",
      features: [
        "M365 Copilot Setup",
        "Power Platform Configuration",
        "Security & Compliance",
        "User Adoption Strategy"
      ],
      pricing: "$3,500+"
    },
    {
      title: "Agent Development",
      description: "Custom AI agents tailored to your business processes",
      icon: "🤖",
      features: [
        "Custom Agent Design",
        "Integration Development",
        "Testing & Optimization",
        "Deployment & Support"
      ],
      pricing: "$1000+"
    },
    {
      title: "Adoption Strategy",
      description: "Ongoing coaching and optimization for maximum ROI",
      icon: "📈",
      features: [
        "Monthly Strategy Sessions",
        "Performance Monitoring",
        "Continuous Optimization",
        "Change Management"
      ],
      pricing: "$500/month"
    }
  ];

  return (
    <section 
      ref={elementRef}
      id="services" 
      className={`py-20 bg-white dark:bg-slate-800 transition-all duration-1000 ${
        isVisible ? 'animate-slide-in-left' : 'opacity-0 -translate-x-8'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-forest-green mb-4">
            Our Services
          </h2>
          <p className="text-lg sm:text-xl text-slate-gray max-w-3xl mx-auto">
            From initial awareness to full adoption, we guide your AI journey every step of the way
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {services.map((service, index) => (
            <Card key={index} className="border-sage/30 hover:border-forest-green/50 transition-all duration-300 hover:shadow-lg group">
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
                    <li key={featureIndex} className="flex items-center space-x-2 text-slate-gray">
                      <div className="w-2 h-2 bg-sage rounded-full"></div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-earth-brown">{service.pricing}</span>
                  <Button variant="outline" className="border-forest-green text-forest-green hover:bg-forest-green hover:text-white transition-all duration-200">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-sage/10 dark:bg-slate-900 rounded-2xl p-8 sm:p-12">
          <h3 className="text-2xl sm:text-3xl font-bold text-forest-green mb-4">
            Ready to Transform Your Business?
          </h3>
          <p className="text-lg text-slate-gray mb-6 max-w-2xl mx-auto">
            Let's discuss how AI can help your business grow smarter while staying rooted in your values.
          </p>
          <Button className="bg-forest-green hover:bg-forest-green/90 text-white px-8 py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg">
            Book a Workshop
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;
