import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, once]);

  return { elementRef, isVisible };
};

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: string;
  delay?: number;
  className?: string;
  once?: boolean;
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  animation = 'animate-slide-up',
  delay = 0,
  className = '',
  once = true
}) => {
  const { elementRef, isVisible } = useScrollAnimation({ once });

  return (
    <div
      ref={elementRef}
      className={`${className} ${isVisible ? animation : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default useScrollAnimation;