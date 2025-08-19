import * as React from 'react'

export interface CountUpProps extends React.HTMLAttributes<HTMLSpanElement> {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
}

export function CountUp({
  end,
  duration = 2000,
  prefix = '',
  suffix = '',
  className,
  ...props
}: CountUpProps) {
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    let start: number | null = null
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      setValue(Math.floor(progress * end))
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }, [end, duration])

  return (
    <span className={className} {...props}>
      {prefix}
      {value}
      {suffix}
    </span>
  )
}

