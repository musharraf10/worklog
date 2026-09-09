/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        brand: {
          light: "#F8FAFC",
          soft: "#E2E8F0",
          primary: "#8bdfed",
          dark: "#0F172A",
        },
      },
    },
  },

  plugins: [],
};
