
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const About = () => {
  const values = [
    {
      title: "Growth-Focused",
      description: "We believe in sustainable growth that builds on your existing strengths",
      icon: "🌱"
    },
    {
      title: "Locally Rooted",
      description: "Kansas City businesses deserve partners who understand the local landscape",
      icon: "🏠"
    },
    {
      title: "Trust & Transparency",
      description: "Clear communication and honest guidance throughout your AI journey",
      icon: "🤝"
    },
    {
      title: "Small Business Champions",
      description: "Tailored solutions that fit your scale, budget, and unique needs",
      icon: "⭐"
    }
  ];

  return (
    <section id="about" className="py-20 bg-sage/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-forest-green mb-4">
            Why RootedAI?
          </h2>
          <p className="text-lg sm:text-xl text-slate-gray max-w-3xl mx-auto">
            We understand that small businesses need AI solutions that are practical, affordable, and aligned with their values.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-white rounded-2xl p-8 sm:p-12 mb-16 shadow-lg">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-forest-green mb-6">Our Mission</h3>
            <p className="text-lg text-slate-gray leading-relaxed mb-8">
              To empower small businesses in Kansas City and beyond with practical AI solutions that drive growth 
              while preserving the personal touch and community values that make them special. We believe that 
              technology should enhance human connection, not replace it.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-earth-brown mb-2">20+</div>
                <div className="text-slate-gray">Businesses Helped</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-earth-brown mb-2">10+</div>
                <div className="text-slate-gray">Years Experience</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-earth-brown mb-2">99%</div>
                <div className="text-slate-gray">Client Satisfaction</div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-forest-green text-center mb-12">
            Our Core Values
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="border-sage/30 hover:border-forest-green/50 transition-all duration-300 hover:shadow-lg text-center group">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{value.icon}</div>
                  <h4 className="text-xl font-semibold text-forest-green mb-3 group-hover:text-earth-brown transition-colors">
                    {value.title}
                  </h4>
                  <p className="text-slate-gray text-sm leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Target Market */}
        <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold text-forest-green text-center mb-8">
              Who We Serve
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-semibold text-earth-brown mb-4">Perfect Fit Businesses:</h4>
                <ul className="space-y-3 text-slate-gray">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Professional services (law, accounting, consulting)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Healthcare practices and clinics</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Real estate agencies and brokerages</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Local retail and e-commerce businesses</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Manufacturing and logistics companies</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-earth-brown mb-4">Business Characteristics:</h4>
                <ul className="space-y-3 text-slate-gray">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>5-50 employees</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Already using Microsoft 365 or Azure</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Growth-minded leadership</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Values efficiency and innovation</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-sage rounded-full mt-2"></div>
                    <span>Committed to employee development</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
