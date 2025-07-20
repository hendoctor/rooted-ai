import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  hapticPattern?: number[];
  triggerOnce?: boolean;
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const {
    threshold = 0.2,
    rootMargin = '0px 0px -100px 0px',
    hapticPattern = [50, 30, 20],
    triggerOnce = true
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  const triggerHapticFeedback = (pattern: number[]) => {
    // Check if device supports vibration and is mobile
    if ('vibrate' in navigator && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.log('Haptic feedback not supported on this device');
      }
    }
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasTriggered)) {
          setIsVisible(true);
          setHasTriggered(true);
          
          // Trigger haptic feedback
          triggerHapticFeedback(hapticPattern);
        } else if (!entry.isIntersecting && !triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, hapticPattern, triggerOnce, hasTriggered]);

  return { elementRef, isVisible, hasTriggered };
};