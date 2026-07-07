/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A0F1D',
          light: '#101830',
          lighter: '#161F3D',
        },
        electric: '#2563EB',
        cyan: '#06B6D4',
        slate: {
          soft: '#F8FAFC',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 20% 20%, rgba(37,99,235,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(6,182,212,0.14), transparent 45%)',
        'electric-cyan': 'linear-gradient(120deg, #2563EB 0%, #06B6D4 100%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.3)',
        'glow-blue': '0 0 40px -8px rgba(37,99,235,0.55)',
        'glow-cyan': '0 0 40px -8px rgba(6,182,212,0.5)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
