/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        brand: {
          light: "#f6f5f0",
          soft: "#e7eee4",
          primary: "#176b4d",
          dark: "#17221d",
        },
      },
    },
  },

  plugins: [],
};
