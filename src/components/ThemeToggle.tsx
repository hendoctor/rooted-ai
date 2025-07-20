import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  )
}

export default ThemeToggle
