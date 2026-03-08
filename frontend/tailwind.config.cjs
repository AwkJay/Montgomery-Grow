/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        'mg-bg': '#020617',
        'mg-card': '#020617',
        'mg-border': '#1e293b',
        'mg-accent': '#22c55e',
      },
    },
  },
  plugins: [],
};


