/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      letterSpacing: { tight: '-0.5px' },
      keyframes: {
        fadeUp: { from: { opacity: "0", transform: "translateY(24px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        fadeOut: { from: { opacity: "1" }, to: { opacity: "0" } },
        pulse: { "0%, 100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: "0.5", transform: "scale(1.4)" } },
        heartbeat: { "0%, 100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: "0.7", transform: "scale(1.4)" } },
        slideUp: { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        floatGlobe: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(3deg)" }
        },
        pulseStatus: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        sway: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        leafFall: {
          "0%": { transform: "translateY(-10vh)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(110vh)", opacity: "0" },
        },
        leafSway: {
          "0%, 100%": { transform: "translateX(-20px) rotate(0deg)" },
          "50%": { transform: "translateX(20px) rotate(45deg)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease both",
        "fade-up-delay-1": "fadeUp 0.6s 0.1s ease both",
        "fade-up-delay-2": "fadeUp 0.6s 0.2s ease both",
        "fade-up-delay-3": "fadeUp 0.6s 0.3s ease both",
        "fade-up-delay-4": "fadeUp 0.6s 0.4s ease both",
        "pulse-dot": "pulse 2s infinite",
        heartbeat: "heartbeat 5s ease-in-out infinite",
        fade: "fade 0.6s ease both",
        "fade-out": "fadeOut 0.6s ease both",
        "float-globe": "floatGlobe 8s ease-in-out infinite",
        "pulse-status": "pulseStatus 2s ease-in-out infinite",
        "sway": "sway 10s ease-in-out infinite",
        "leaf-fall": "leafFall 10s linear infinite",
        "leaf-sway": "leafSway 3s ease-in-out infinite",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        tight: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          surface: 'var(--bg-background-surface)',
          'nav-scrolled': 'var(--bg-nav-scrolled)',
          icon: 'var(--border-default)',
          tag: 'var(--border-default)',
          grid: 'var(--grid-color)',
          selection: 'var(--accent-shadow)',
          glass: 'var(--glass-bg)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
          dimmed: 'var(--text-dimmed)',
          disabled: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: ({ opacityValue }) => {
            if (opacityValue !== undefined) {
              return `rgb(var(--accent-rgb) / ${opacityValue})`;
            }
            return `rgb(var(--accent-rgb))`;
          },
          rgb: 'var(--accent-rgb)',
          glow: 'var(--accent-glow)',
          shadow: 'var(--accent-shadow)',
          'line-start': 'var(--accent-line-start)',
          'line-end': 'var(--accent-line-end)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          elevated: 'var(--border-elevated)',
          glass: 'var(--glass-border)',
        },
        btn: {
          primary: {
            bg: 'var(--text-primary)',
            text: 'var(--bg-primary)',
            hover: 'var(--accent)',
          },
          secondary: {
            bg: 'transparent',
            text: 'var(--text-secondary)',
            'hover-text': 'var(--text-primary)',
            'hover-bg': 'var(--border-default)',
          },
        },
        danger: ({ opacityValue }) => {
          if (opacityValue !== undefined) {
            return `rgb(var(--danger-rgb) / ${opacityValue})`;
          }
          return `var(--danger)`;
        },
        success: ({ opacityValue }) => {
          if (opacityValue !== undefined) {
            return `rgb(var(--success-rgb) / ${opacityValue})`;
          }
          return `var(--success)`;
        },
        warning: ({ opacityValue }) => {
          if (opacityValue !== undefined) {
            return `rgb(var(--warning-rgb) / ${opacityValue})`;
          }
          return `var(--warning)`;
        },
      },
      backgroundImage: {
        'overlay-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.6) 80%, #000 100%)',
        'cursor-glow': 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
        'mask-gradient': 'linear-gradient(to right, transparent 0%, black 40%)',
        'dot-pattern': 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
      },
      backdropBlur: {
        '20': '20px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0,0,0,0.1), inset 0 1px 0 var(--glass-border)',
      },
    },
  },
  plugins: [],
};