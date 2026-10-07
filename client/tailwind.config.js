/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2fbf4',
          100: '#e1f7e7',
          200: '#c3eed3',
          300: '#95deb5',
          400: '#5fc591',
          500: '#34aa72',
          600: '#268a5c',
          700: '#206e4b',
          800: '#1c573d',
          900: '#184734',
          950: '#0c271d',
        },
        earth: {
          50: '#fbf8f3',
          100: '#f5eee3',
          200: '#eadbc7',
          300: '#dcbe9f',
          400: '#cc9e75',
          500: '#bd8357',
          600: '#a76a47',
          700: '#87523b',
          800: '#6f4435',
          900: '#5c3a2f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        sinhala: ['Noto Sans Sinhala', 'sans-serif']
      }
    },
  },
  plugins: [],
}
