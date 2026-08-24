/**
 * App-wide color palette.
 * Keep these in sync with `tailwind.config.js` `theme.extend.colors`
 * so the same tokens are usable both as NativeWind classes (`bg-brand-DEFAULT`)
 * and as raw hex values (needed by SVG/LinearGradient, which cannot read
 * Tailwind classes).
 */
export const colors = {
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
} as const;
