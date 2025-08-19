
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';

const Reviews = () => {
  const testimonials = [
    {
      quote: "Philip made AI easy to understand and implement. Their expertise helped us automate processes, saving time and boosting efficiency. I highly recommend Philip for any business looking to leverage AI!",
      name: "Don Bruns",
      title: "Founder and CEO",
      company: "The Survey Institute",
      rating: 5
    }
  ];
  const stats = [
    {
      end: 100,
      suffix: '%',
      label: 'Ready to Deliver',
    },
    {
      end: 200,
      suffix: '+',
      label: 'Hours Saved Weekly',
    },
    {
      end: 40,
      suffix: '%',
      label: 'Average Productivity Increase',
    },
  ];
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-forest-green' : 'text-sage'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <section id="reviews" className="py-20 bg-cream dark:bg-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl lg:text-5xl font-bold text-forest-green mb-6">
            What Our Clients Say
          </h2>
          <p className="text-lg text-slate-gray max-w-3xl mx-auto leading-relaxed">
            Real stories from Kansas City businesses who've embraced AI with our help
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => {
            const card = (
              <Card
                className="card-energy bg-white dark:bg-slate-900 shadow-lg border-0 animate-elastic-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardContent className="p-8">
                  {/* Quote Icon */}
                  <div className="text-sage text-6xl font-serif mb-4 leading-none">"</div>

                  {/* Rating */}
                  <div className="flex mb-6">{renderStars(testimonial.rating)}</div>

                  {/* Quote */}
                  <blockquote className="text-slate-gray leading-relaxed mb-6 italic">
                    {testimonial.quote}
                  </blockquote>

                  {/* Author Info */}
                  <div className="border-t border-sage/20 pt-6">
                    <div className="font-semibold text-forest-green text-lg">
                      {testimonial.name}
                    </div>
                    <div className="text-earth-brown font-medium">
                      {testimonial.title}
                    </div>
                    <div className="text-slate-gray text-sm">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            );

            return testimonial.company === "The Survey Institute" ? (
              <a
                key={index}
                href="https://surveyinstitute.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {card}
              </a>
            ) : (
              <React.Fragment key={index}>{card}</React.Fragment>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="bg-forest-green dark:bg-[hsl(139_28%_25%)] rounded-2xl p-8 lg:p-12 animate-fade-in-up">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="text-white">
                <CountUp
                  end={stat.end}
                  suffix={stat.suffix}
                  className="text-4xl lg:text-5xl font-bold mb-2 text-sage"
                />
                <div className="text-lg font-medium opacity-90">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
