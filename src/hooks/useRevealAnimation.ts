import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useRevealAnimation = () => {
  const location = useLocation();

  useEffect(() => {
    const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motionOK) return;

    const elements = document.querySelectorAll('.anim-section, .anim-card');
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [location.pathname]);
};
