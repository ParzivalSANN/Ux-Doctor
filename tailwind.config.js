/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          deep: '#1e1730',
          base: '#261d3d',
          card: '#2f244c',
          surface: '#392c5c',
          hover: '#45356e'
        },
        pastel: {
          mint: '#7ee7c7',
          'mint-dark': '#15382b',
          yellow: '#fed668',
          'yellow-dark': '#423200',
          coral: '#ff9f76',
          'coral-dark': '#4a2313',
          pink: '#ff85a1',
          'pink-dark': '#4a1523',
          red: '#ff6b6b',
          'red-dark': '#471414',
          lavender: '#b8a5e3',
          muted: '#8a7ea8'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        'chunky': '24px'
      },
      boxShadow: {
        'chunky': '0 8px 0 rgba(0, 0, 0, 0.22)',
        'chunky-sm': '0 4px 0 rgba(0, 0, 0, 0.2)',
        'chunky-mint': '0 6px 0 #4da98f',
        'chunky-yellow': '0 6px 0 #c29d38',
        'chunky-coral': '0 6px 0 #cc6b43',
        'card-glow': '0 10px 30px -10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      }
    },
  },
  plugins: [],
}
