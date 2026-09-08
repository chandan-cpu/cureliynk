/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  // "class" (not the default "media") is what lets the app override the OS
  // setting from the profile screen — NativeWind's `setColorScheme` throws
  // outright under `darkMode: "media"`. "system" still follows the OS.
  darkMode: "class",
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
        // Semantic theme tokens. Each has a `-dark` sibling used through the
        // `dark:` variant, e.g. `bg-surface dark:bg-surface-dark`. Keep these
        // in sync with `themeColors` in `constants/colors.ts`.
        surface: {
          DEFAULT: "#EFF6FC",
          dark: "#0A1A2F",
        },
        card: {
          DEFAULT: "#FFFFFF",
          dark: "#0F2338",
        },
        content: {
          DEFAULT: "#0F172A",
          dark: "#F8FAFC",
        },
        muted: {
          DEFAULT: "#64748B",
          dark: "#94A3B8",
        },
        line: {
          DEFAULT: "#E2E8F0",
          dark: "#1E3A52",
        },
        field: {
          DEFAULT: "#F8FAFC",
          dark: "#132C44",
        },
      },
    },
  },
  plugins: [],
}
