
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
                        transitionTimingFunction: {
                                'ai-standard': 'cubic-bezier(0.4,0,0.2,1)'
                        },
                        transitionDuration: {
                                'ai-enter': '320ms',
                                'ai-exit': '240ms',
                                'ai-fast': '160ms'
                        },
                        keyframes: {
                                'accordion-down': {
                                        from: {
                                                height: '0',
                                                opacity: '0'
                                        },
                                        to: {
                                                height: 'var(--radix-accordion-content-height)',
                                                opacity: '1'
                                        }
                                },
                                'accordion-up': {
                                        from: {
                                                height: 'var(--radix-accordion-content-height)',
                                                opacity: '1'
                                        },
                                        to: {
                                                height: '0',
                                                opacity: '0'
                                        }
                                },
                                'fade-in-up': {
                                        '0%': {
                                                opacity: '0',
                                                transform: 'translateY(30px)'
                                        },
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
                                'fade-in': {
                                        '0%': {
                                                opacity: '0'
                                        },
                                        '100%': {
                                                opacity: '1'
                                        }
                                },
                                'section-reveal': {
                                        '0%': {
                                                opacity: '0',
                                                transform: 'translateY(10px) scale(0.995)'
                                        },
                                        '100%': {
                                                opacity: '1',
                                                transform: 'translateY(0) scale(1)'
                                        }
                                },
                                'card-enter': {
                                        '0%': {
                                                opacity: '0',
                                                transform: 'translateY(8px)'
                                        },
                                        '100%': {
                                                opacity: '1',
                                                transform: 'translateY(0)'
                                        }
                                },
                                'button-hover': {
                                        '0%': { transform: 'scale(1)' },
                                        '60%': { transform: 'scale(1.015)' },
                                        '100%': { transform: 'scale(1.01)' }
                                },
                                'button-active': {
                                        '0%': { transform: 'scale(1.01)' },
                                        '100%': { transform: 'scale(0.99)' }
                                },
                                'icon-nudge': {
                                        '0%': { opacity: '0.9', transform: 'translateY(0)' },
                                        '100%': { opacity: '1', transform: 'translateY(-2px)' }
                                },
                                'gradient-shift': {
                                        '0%': { backgroundPosition: '0% 50%' },
                                        '100%': { backgroundPosition: '100% 50%' }
                                }
                        },
                        animation: {
                                'accordion-down': 'accordion-down 0.3s ease-in-out',
                                'accordion-up': 'accordion-up 0.3s ease-in-out',
                                'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
                                'fade-in': 'fade-in 0.8s ease-out forwards',
                                'section-reveal': 'section-reveal var(--anim-duration-enter) var(--anim-ease) forwards',
                                'card-enter': 'card-enter var(--anim-duration-enter) var(--anim-ease) forwards',
                                'button-hover': 'button-hover 100ms var(--anim-ease) forwards',
                                'button-active': 'button-active 80ms var(--anim-ease) forwards',
                                'icon-nudge': 'icon-nudge 90ms var(--anim-ease) forwards',
                                'gradient-shift': 'gradient-shift 2.5s ease-in-out'
                        }
                }
        },
        plugins: [animate],
} satisfies Config;
