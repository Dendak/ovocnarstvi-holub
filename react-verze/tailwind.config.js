/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f2f9f2',
          100: '#e0f2e0',
          200: '#b8e0b8',
          300: '#86c886',
          400: '#52a852',
          500: '#2e8b2e',
          600: '#237023',
          700: '#1a561a',
          800: '#133e13',
          900: '#0d2b0d',
        },
        earth: {
          50:  '#faf7f2',
          100: '#f0e8d8',
          200: '#ddd0b0',
          300: '#c4b080',
          400: '#a08040',
          500: '#7a5c20',
          600: '#5c4010',
          700: '#3e2a08',
          800: '#251804',
          900: '#120c02',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
