import { useEffect, useRef, useState } from 'react';

export function useScrollReveal<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, options ?? { threshold: 0.1 });

    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}

export default useScrollReveal;
