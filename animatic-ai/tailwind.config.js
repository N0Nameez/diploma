  /** @type {import('tailwindcss').Config} */
  export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        keyframes: {
          fadeUp: {
            from: { opacity: '0', transform: 'translateY(24px)' },
            to: { opacity: '1', transform: 'translateY(0)' },
          },
          fade: {
            from: { opacity: '0'},
            to: { opacity: '1'},
          },
          fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
          },
          pulse: {
            '0%, 100%': { opacity: '1', transform: 'scale(1)' },
            '50%': { opacity: '0.5', transform: 'scale(1.4)' },
          },
          heartbeat: {
            '0%, 100%': { opacity: '1', transform: 'scale(1)' },
            '50%': { opacity: '0.7',transform: 'scale(1.4)' },
          }
        },

        animation: {
          'fade-up': 'fadeUp 0.6s ease both',
          'fade-up-delay-1': 'fadeUp 0.6s 0.1s ease both',
          'fade-up-delay-2': 'fadeUp 0.6s 0.2s ease both',
          'fade-up-delay-3': 'fadeUp 0.6s 0.3s ease both',
          'fade-up-delay-4': 'fadeUp 0.6s 0.4s ease both',
          'pulse-dot': 'pulse 2s infinite',
          'heartbeat': 'heartbeat 5s ease-in-out infinite',
          'fade': 'fade 0.6s ease both',
          'fade-out': 'fadeOut 0.6s ease both',
        },
        backgroundImage: {
          'hero-gradient': 'var(--hero-gradient)',
          'grid-pattern': `linear-gradient(var(--border) 1px, transparent 1px),
                          linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        },
        colors: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          surface2: 'var(--surface2)',
          text: 'var(--text)',
          textSecondary: 'var(--text-secondary)',
          accent: 'var(--accent)',
          accentGlow: 'var(--accent-glow)',
          accent2: 'var(--accent2)',
          border: 'var(--border)',
          navBg: 'var(--nav-bg)',
          tagBg: 'var(--tag-bg)',
          cardBg: 'var(--card-bg)',
        },
      },
    },
    plugins: [],
  }