/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#22C55E",
          dark: "#15803D",
          light: "#4ADE80",
        },
        background: {
          DEFAULT: "#0A1A2F",
          elevated: "#0F2338",
        },
        ink: {
          primary: "#F8FAFC",
          muted: "#94A3B8",
        },
        surface: {
          DEFAULT: "#EFF6FC",
        },
      },
    },
  },
  plugins: [],
}