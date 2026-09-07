/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Bikera-inspired palette (ported from web tokens.css)
        brand: {
          purple: '#42C0FB',
          violet: '#2BB4F0',
          indigo: '#1A9FE0',
          blue300: '#2BB4F0',
          blue400: '#1A9FE0',
        },
        surface: {
          0: '#000000',
          1: '#000000',
          2: '#0A0A0A',
          3: '#111111',
        },
        text: {
          primary: '#F4FBFF',
          secondary: '#D7E8F2',
          tertiary: '#7A93A3',
          muted: '#5C707C',
        },
        state: {
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#42C0FB',
        },
        border: {
          1: 'rgba(255, 255, 255, 0.10)',
          2: 'rgba(255, 255, 255, 0.05)',
        },
      },
      borderRadius: {
        xl: 20,
        '2xl': 28,
        '3xl': 32,
      },
    },
  },
  plugins: [],
};


