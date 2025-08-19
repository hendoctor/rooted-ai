import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number | string;
  durationMs?: number;
  formatter?: (value: number) => string;
  className?: string;
}

const CountUp: React.FC<CountUpProps> = ({ value, durationMs = 1500, formatter, className }) => {
  // Determine numeric target and formatter based on input
  let target = 0;
  let format = formatter;

  if (typeof value === 'string') {
    const match = value.trim().match(/^([^0-9]*)([0-9]*\.?[0-9]+)(.*)$/);
    if (match) {
      const prefix = match[1] ?? '';
      target = parseFloat(match[2]);
      const suffix = match[3] ?? '';
      format = format || ((val: number) => `${prefix}${Math.round(val)}${suffix}`);
    } else {
      // Fallback if parsing fails
      target = Number(value) || 0;
      format = format || ((val: number) => Math.round(val).toString());
    }
  } else {
    target = value;
    format = format || ((val: number) => Math.round(val).toString());
  }

  const [display, setDisplay] = useState<string>(format(0));
  const ref = useRef<HTMLSpanElement | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(format(target));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();

          const step = (now: number) => {
            const progress = (now - start) / durationMs;
            const clamped = Math.min(progress, 1);
            const current = target * clamped;
            setDisplay(format(current));
            if (clamped < 1) {
              requestAnimationFrame(step);
            }
          };

          requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [target, durationMs, format]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
};

export default CountUp;
