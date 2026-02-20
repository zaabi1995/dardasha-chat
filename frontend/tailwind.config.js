/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        wa: {
          dark: '#111b21',
          darker: '#0c1317',
          panel: '#202c33',
          header: '#233138',
          green: '#00a884',
          greenDark: '#008069',
          teal: '#02a698',
          text: '#e9deef',
          textSec: '#8696a0',
          bubble: '#005c4b',
          bubbleIn: '#1d282f',
          input: '#2a3942',
          border: '#313d45',
          hover: '#2a3942',
          blue: '#53bdeb',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
