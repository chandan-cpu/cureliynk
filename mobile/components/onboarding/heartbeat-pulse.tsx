import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/constants/colors";

/**
 * ECG-style waveform: flat baseline, one heartbeat spike, flat baseline.
 * Coordinates are hand-drawn against a 300x64 viewBox and stretch to fill
 * whatever width the parent gives it (see `preserveAspectRatio="none"`).
 */
const PULSE_PATH = "M0,32 L70,32 L88,8 L104,56 L120,20 L136,32 L300,32";

export function HeartbeatPulse() {
  return (
    <View className="w-full h-16">
      <Svg width="100%" height="100%" viewBox="0 0 300 64" preserveAspectRatio="none">
        {/* Soft glow pass: wider, translucent stroke sitting behind the crisp line */}
        <Path
          d={PULSE_PATH}
          fill="none"
          stroke={colors.brand.DEFAULT}
          strokeOpacity={0.35}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={PULSE_PATH}
          fill="none"
          stroke={colors.brand.light}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
