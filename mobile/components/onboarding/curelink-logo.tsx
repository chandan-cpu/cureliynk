import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { colors } from "@/constants/colors";

type CurelinkLogoProps = {
  /** Width/height of the square logo, in dp. */
  size?: number;
};

/**
 * The heart-and-cross mark used on the onboarding splash screen.
 * Drawn with react-native-svg instead of a raster asset so it stays crisp
 * at any size and its colors can follow the shared theme tokens.
 */
export function CurelinkLogo({ size = 120 }: CurelinkLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="heartFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.brand.light} />
          <Stop offset="100%" stopColor={colors.brand.dark} />
        </LinearGradient>
      </Defs>

      <Path
        d="M12,21.35 L10.55,20.03 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 C9.24,3 10.91,3.81 12,5.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 C22,12.28 18.6,15.36 13.45,20.04 L12,21.35 Z"
        fill="url(#heartFill)"
      />

      {/* White medical cross, centered on the body of the heart */}
      <Rect x="10.5" y="6.5" width="3" height="9" rx="1" fill="#FFFFFF" />
      <Rect x="7.5" y="9.5" width="9" height="3" rx="1" fill="#FFFFFF" />
    </Svg>
  );
}
