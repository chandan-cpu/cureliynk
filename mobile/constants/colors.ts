/**
 * App-wide color palette.
 *
 * Two layers live here:
 *
 * 1. `colors` — brand values that mean the same thing in both themes.
 * 2. `themeColors` — the light/dark pairs behind the semantic Tailwind tokens
 *    (`surface`, `card`, `content`, `muted`, `line`, `field`).
 *
 * Keep both in sync with `tailwind.config.js` `theme.extend.colors` so the same
 * tokens are usable as NativeWind classes (`bg-card dark:bg-card-dark`) and as
 * raw hex values (needed by SVG/LinearGradient/Ionicons/ActivityIndicator,
 * which cannot read Tailwind classes). Read the resolved set for the active
 * theme with `useThemeColors()` from `@/lib/theme-context`.
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

/** The resolved color set for one theme — the shape `useThemeColors()` returns. */
export type ThemeColors = {
  /** Screen background. */
  surface: string;
  /** Raised card background sitting on `surface`. */
  card: string;
  /** Primary text, and the tint for back arrows / headings. */
  content: string;
  /** Secondary text. */
  muted: string;
  /** Decorative icons (chevrons, empty-state glyphs) and input placeholders. */
  icon: string;
  /** Hairline borders and dividers. */
  line: string;
  /** Text input background. */
  field: string;
  /** Brand green at the contrast it needs against this theme's background. */
  brand: string;
  /** Text/icon color that sits on top of a filled brand button. */
  onBrand: string;
  danger: string;
  accentBlue: string;
  accentGreen: string;
  accentAmber: string;
  accentPink: string;
  accentStar: string;
};

export const themeColors: Record<"light" | "dark", ThemeColors> = {
  light: {
    surface: "#EFF6FC",
    card: "#FFFFFF",
    content: "#0F172A",
    muted: "#64748B",
    icon: "#94A3B8",
    line: "#E2E8F0",
    field: "#F8FAFC",
    brand: "#15803D",
    onBrand: "#FFFFFF",
    danger: "#DC2626",
    accentBlue: "#2563EB",
    accentGreen: "#16A34A",
    accentAmber: "#D97706",
    accentPink: "#BE185D",
    accentStar: "#F59E0B",
  },
  dark: {
    surface: "#0A1A2F",
    card: "#0F2338",
    content: "#F8FAFC",
    muted: "#94A3B8",
    icon: "#94A3B8",
    line: "#1E3A52",
    field: "#132C44",
    // The light theme's #15803D is far too dark to read against navy, so the
    // dark theme steps up to the mid/light brand greens throughout.
    brand: "#4ADE80",
    onBrand: "#052E16",
    danger: "#F87171",
    accentBlue: "#60A5FA",
    accentGreen: "#4ADE80",
    accentAmber: "#FBBF24",
    accentPink: "#F472B6",
    accentStar: "#FBBF24",
  },
};
