/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 10px 30px rgba(99, 102, 241, 0.25)',
      },
    },
  },
  plugins: [],
}
