/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0C0E',
        graphite: '#141519',
        steel: '#1D2026',
        ash: '#2C3038',
        iron: '#454B55',
        smoke: '#878D98',
        paper: '#F2EDE4',
        parchment: '#E4DCCC',
        brass: '#E0A22B',
        'brass-deep': '#A8761A',
        ember: '#D9541E',
        patina: '#2E8B77',
        cobalt: '#3D6BC4',
        violet: '#7A5AC4',
        rose: '#C4467A',
      },
      fontFamily: {
        display: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      transitionTimingFunction: {
        mech: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
