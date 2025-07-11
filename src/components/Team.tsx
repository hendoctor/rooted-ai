
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe } from 'lucide-react';

const Team = () => {
  const teamMembers = [
    {
      name: "Philip",
      role: "Client Success & Training Lead",
      image: "/Assets/Philip-2.jpg",
      bio: "With over a decade of experience leading digital transformation and AI initiatives at global organizations, Philip brings enterprise-level innovation to small businesses in Kansas City and beyond. His background spans engineering, change management, and AI enablement, with a focus on making technology approachable and impactful. ",
      expertise: [
        "Front-end Development",
        "Client Training & Support",
        "Change Management",
        "User Experience Design",
        "Workshop Facilitation"
      ],
      contact: {
        linkedin: "https://www.linkedin.com/in/philip-niemerg-9924337b",
        email: "Niemergengineering@gmail.com"
      }
    },
    {
      name: "James",
      role: "AI Architecture & Security Lead",
      image: "/Assets/JamesHennahaneProfilePic.png",
      bio: "With years of experience leading IT departments for global organizations, James brings deep expertise in enterprise systems, infrastructure, and digital operations. His work focuses on building secure, scalable solutions that align technology with real business needs.",
      expertise: [
        "AI Solution Architecture",
        "Cloud Infrastructure",
        "Security & Compliance",
        "System Integrations",
        "DevOps & Automation",
        "Microsoft Azure & M365"
      ],
      contact: {
        linkedin: "https://www.linkedin.com/in/jameshennahane/",
        email: "james@hennahane.com",
        website: "https://jmh-iii.lovable.app/"
      }
    }
  ];

  return (
    <section id="team" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-forest-green mb-4">
            Meet Our Team
          </h2>
          <p className="text-lg sm:text-xl text-slate-gray max-w-3xl mx-auto">
            Local Kansas City experts with deep experience in AI, technology, and small business growth
          </p>
        </div>

        {/* Team Members */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {teamMembers.map((member, index) => (
            <Card key={index} className="border-sage/30 hover:border-forest-green/50 transition-all duration-300 hover:shadow-xl overflow-hidden">
              <div className="p-8">
                {/* Profile Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
                  <div className="relative">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-sage/30"
                    />
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-forest-green/10"></div>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-2xl font-bold text-forest-green mb-1">{member.name}</h3>
                    <p className="text-earth-brown font-semibold mb-3">{member.role}</p>
                    <div className="flex space-x-3 justify-center sm:justify-start">
                      <a
                        href={member.contact.linkedin}
                        className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center hover:bg-forest-green hover:text-white transition-all duration-200"
                      >
                        <span className="text-sm">in</span>
                      </a>
                      <a
                        href={`mailto:${member.contact.email}`}
                        className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center hover:bg-forest-green hover:text-white transition-all duration-200"
                      >
                        <span className="text-sm">@</span>
                      </a>
                      {member.contact.website && (
                        <a
                          href={member.contact.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center hover:bg-forest-green hover:text-white transition-all duration-200"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-slate-gray leading-relaxed mb-6">
                  {member.bio}
                </p>

                {/* Expertise */}
                <div>
                  <h4 className="text-lg font-semibold text-forest-green mb-3">Core Expertise</h4>
                  <div className="flex flex-wrap gap-2">
                    {member.expertise.map((skill, skillIndex) => (
                      <span
                        key={skillIndex}
                        className="px-3 py-1 bg-sage/20 text-slate-gray text-sm rounded-full hover:bg-sage/30 transition-colors duration-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Team Philosophy */}
        <div className="mt-16 bg-sage/5 rounded-2xl p-8 sm:p-12 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-forest-green mb-6">
            Our Approach
          </h3>
          <p className="text-lg text-slate-gray max-w-4xl mx-auto leading-relaxed">
            We believe that successful AI implementation requires both technical expertise and human understanding. 
            Our team combines deep technical knowledge with a genuine commitment to helping small businesses thrive. 
            We're not just consultants—we're your local partners in growth, here to support you every step of the way.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Team;
