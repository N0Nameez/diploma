/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
          primary: '#000',
          secondary: '#141414',
          surface: 'rgba(255, 255, 255, 0.02)',
          'nav-scrolled': 'rgba(20, 20, 20, 0.65)',
          icon: 'rgba(255, 255, 255, 0.06)',
          tag: 'rgba(255, 255, 255, 0.06)',
          grid: 'rgba(255, 255, 255, 0.08)',
          selection: 'rgba(236, 72, 153, 0.3)',
          overlay: {
            1: 'rgba(0, 0, 0, 0.1)',
            2: 'rgba(0, 0, 0, 0.3)',
            3: 'rgba(0, 0, 0, 0.6)',
          },
        },
        text: {
          primary: '#fff',
          secondary: 'rgba(255, 255, 255, 0.6)',
          tertiary: 'rgba(255, 255, 255, 0.5)',
          muted: 'rgba(255, 255, 255, 0.4)',
          dimmed: 'rgba(255, 255, 255, 0.35)',
          disabled: 'rgba(255, 255, 255, 0.3)',
          selection: '#fff',
        },
        accent: {
          DEFAULT: '#EC4899',
          rgb: '236, 72, 153', // для opacity-утилит: bg-accent/20
          glow: 'rgba(236, 72, 153, 0.08)',
          shadow: 'rgba(236, 72, 153, 0.2)',
          'line-start': 'rgba(236, 72, 153, 0.4)',
          'line-end': 'rgba(236, 72, 153, 0.6)',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          elevated: 'rgba(255, 255, 255, 0.12)',
          'section-label': 'rgba(255, 255, 255, 0.2)',
        },
        scrollbar: {
          thumb: 'rgba(255, 255, 255, 0.15)',
          'thumb-hover': 'rgba(255, 255, 255, 0.25)',
          track: '#000',
        },
        status: {
          online: '#EC4899',
          'online-glow': 'rgba(236, 72, 153, 0.6)',
        },
        btn: {
          primary: {
            bg: '#fff',
            text: '#000',
            hover: 'rgba(255, 255, 255, 0.85)',
          },
          secondary: {
            bg: 'transparent',
            text: 'rgba(255, 255, 255, 0.6)',
            'hover-text': '#fff',
            'hover-bg': 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
      backgroundImage: {
        'overlay-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.6) 80%, #000 100%)',
        'cursor-glow': 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
        'mask-gradient': 'linear-gradient(to right, transparent 0%, black 40%)',
        'dot-pattern': 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
      },
      backdropBlur: {
        '20': '20px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};