
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const ProfileImage = ({ member, index }: { member: any, index: number }) => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startRotationRef = useRef(0);

  const logoUrl = "/lovable-uploads/ce6a66fb-80e8-4092-84eb-db436fcb1cad.png";

  // Physics animation for momentum
  const animate = () => {
    if (Math.abs(velocityRef.current) < 0.1) {
      setIsAnimating(false);
      // Snap to nearest 180 degree increment (closest side)
      const normalizedRotation = rotation % 360;
      const adjustedRotation = normalizedRotation < 0 ? normalizedRotation + 360 : normalizedRotation;
      
      // Find closest snap point (0 or 180 degrees within current 360 cycle)
      const snapPoints = [0, 180];
      const closestSnap = snapPoints.reduce((prev, curr) => {
        const prevDiff = Math.min(Math.abs(adjustedRotation - prev), Math.abs(adjustedRotation - (prev + 360)));
        const currDiff = Math.min(Math.abs(adjustedRotation - curr), Math.abs(adjustedRotation - (curr + 360)));
        return currDiff < prevDiff ? curr : prev;
      });
      
      // Calculate final rotation maintaining the current cycle
      const currentCycle = Math.floor(rotation / 360);
      const finalRotation = currentCycle * 360 + closestSnap;
      
      setRotation(finalRotation);
      return;
    }

    velocityRef.current *= 0.95; // Friction
    setRotation(prev => prev + velocityRef.current);
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Mouse handlers
  const handleMouseEnter = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      velocityRef.current = 12; // Reduced from 20 to slow down spinning
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startRotationRef.current = rotation;
    lastTimeRef.current = Date.now();
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsAnimating(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startXRef.current;
    const newRotation = startRotationRef.current + deltaX * 2;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTimeRef.current;
    
    if (deltaTime > 0) {
      velocityRef.current = (deltaX * 2) / deltaTime * 10;
    }
    
    setRotation(newRotation);
    lastTimeRef.current = currentTime;
  };

  const handleTouchEnd = () => {
    setIsAnimating(true);
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-24 h-24">
      <div
        ref={containerRef}
        className="w-24 h-24 preserve-3d cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          perspective: '1000px',
          touchAction: 'none',
          userSelect: 'none',
          transform: `rotateY(${rotation}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Profile Image */}
        <div
          className="absolute inset-0 w-24 h-24 backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <img
            src={member.image}
            alt={member.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-sage/30"
          />
        </div>
        
        {/* Logo Back */}
        <div
          className="absolute inset-0 w-24 h-24 backface-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="w-24 h-24 rounded-full bg-white border-4 border-sage/30 flex items-center justify-center p-1">
            <img
              src={logoUrl}
              alt="RootedAI Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>
      </div>
      
      {/* Background overlay to maintain original styling */}
      <div className="absolute inset-0 w-24 h-24 rounded-full bg-forest-green/10 pointer-events-none"></div>
    </div>
  );
};

const Team = () => {
  const { elementRef, isVisible } = useScrollAnimation({
    hapticPattern: [45, 25, 35, 15]
  });

  const teamMembers = [
    {
      name: "Philip",
      role: "Co-Founder & Chief Executive Officer",
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
      name: "James Hennahane",
      role: "Co-Founder & Chief Technology Officer",
      image: "/Assets/JamesHennahaneProfilePic.png",
      bio: "With a strong foundation in enterprise IT leadership and a deep commitment to making AI accessible to all, James leads RootedAI’s mission to empower businesses through secure, scalable, and actionable AI solutions. Drawing on over a decade of experience in digital operations, cloud infrastructure, architecture, and automation, he designs AI-powered systems that align seamlessly with real-world business needs—especially for underserved and local communities.",
      expertise: [
        "AI Solution Architecture",
        "Microsoft Azure & Microsoft 365",
        "Secure Cloud Infrastructure",
        "Compliance-Ready System Design",
        "DevOps & Intelligent Automation",
        "Business-Aligned Integrations"
      ],
      contact: {
        linkedin: "https://www.linkedin.com/in/jameshennahane/",
        email: "james@hennahane.com",
        website: "https://james.hennahane.com"
      }
    }
  ];

  return (
    <section 
      ref={elementRef}
      id="team" 
      className={`py-20 bg-white dark:bg-slate-800 transition-all duration-1000 ${
        isVisible ? 'animate-slide-in-right' : 'opacity-0 translate-x-8'
      }`}
    >
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
                  <ProfileImage member={member} index={index} />
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
        <div className="mt-16 bg-sage/5 dark:bg-slate-900 rounded-2xl p-8 sm:p-12 text-center">
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

// Add CSS classes to global styles
const styles = `
.perspective-1000 {
  perspective: 1000px;
}

.preserve-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
}
`;
