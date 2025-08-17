
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'inter': ['Inter', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// RootedAI Brand Colors
				'forest-green': 'hsl(var(--forest-green))',
				'earth-brown': 'hsl(var(--earth-brown))',
				'sage': 'hsl(var(--sage))',
				'cream': 'hsl(var(--cream))',
				'slate-gray': 'hsl(var(--slate-gray))'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				// Accordion animations
				'accordion-down': {
					from: { height: '0', opacity: '0' },
					to: { height: 'var(--radix-accordion-content-height)', opacity: '1' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
					to: { height: '0', opacity: '0' }
				},

				// Entry animations (scroll-triggered)
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(40px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-right': {
					'0%': { opacity: '0', transform: 'translateX(-40px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'slide-left': {
					'0%': { opacity: '0', transform: 'translateX(40px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.9)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},

				// Innovation energy animations
				'spring-up': {
					'0%': { opacity: '0', transform: 'translateY(30px) scale(0.95)' },
					'60%': { opacity: '0.8', transform: 'translateY(-5px) scale(1.02)' },
					'100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
				},
				'elastic-in': {
					'0%': { opacity: '0', transform: 'scale(0.3)' },
					'50%': { opacity: '0.8', transform: 'scale(1.05)' },
					'70%': { opacity: '0.9', transform: 'scale(0.97)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},

				// Glow effects
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 5px hsl(var(--forest-green) / 0.3)' },
					'50%': { boxShadow: '0 0 20px hsl(var(--forest-green) / 0.6), 0 0 30px hsl(var(--forest-green) / 0.4)' }
				},
				'accent-glow': {
					'0%': { boxShadow: '0 0 0 hsl(var(--forest-green) / 0)' },
					'100%': { boxShadow: '0 4px 20px hsl(var(--forest-green) / 0.4)' }
				},

				// Interactive micro-animations
				'bounce-micro': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-2px)' }
				},
				'pulse-scale': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.02)' }
				}
			},
			animation: {
				// Accordion
				'accordion-down': 'accordion-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'accordion-up': 'accordion-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

				// Entry animations with spring easing
				'slide-up': 'slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'slide-up-delayed': 'slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',
				'slide-up-delayed-2': 'slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
				'slide-up-delayed-3': 'slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',

				'slide-right': 'slide-right 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'slide-right-delayed': 'slide-right 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',

				'slide-left': 'slide-left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'slide-left-delayed': 'slide-left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',

				'fade-in': 'fade-in 0.5s ease-out',
				'fade-in-delayed': 'fade-in 0.5s ease-out 0.1s both',

				'scale-in': 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'scale-in-delayed': 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',

				// Innovation energy
				'spring-up': 'spring-up 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'spring-up-delayed': 'spring-up 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both',

				'elastic-in': 'elastic-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'elastic-in-delayed': 'elastic-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.1s both',

				// Glow effects
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'accent-glow': 'accent-glow 0.3s ease-out forwards',

				// Interactive
				'bounce-micro': 'bounce-micro 0.3s ease-in-out',
				'pulse-scale': 'pulse-scale 0.6s ease-in-out infinite'
			}
                }
        },
        plugins: [animate],
} satisfies Config;
