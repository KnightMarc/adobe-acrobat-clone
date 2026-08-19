/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        acrobat: {
          red: "#FA0F00",
          darkRed: "#CC0C00",
          bg: "#F4F5F7",
          toolbar: "#FFFFFF",
          sidebar: "#F8F9FA",
          dark: "#1E1E1E",
          border: "#E2E8F0"
        }
      }
    },
  },
  plugins: [],
}
