/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#1a2234',
          950: '#0d1424',
        },
      },
    },
  },
  plugins: [],
};
