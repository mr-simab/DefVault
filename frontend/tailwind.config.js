/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          900: '#0f172a',
        },
        amber: {
          500: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
