import { Ionicons } from "@expo/vector-icons";
import { View, type ColorValue } from "react-native";

import { useThemeColors } from "@/lib/theme";

/**
 * The middle tab's icon. Sized against the icon slot the tab bar hands every
 * other tab (`size`) so it grows and shrinks with the platform's tab metrics
 * instead of being pinned to one hard-coded diameter.
 *
 * The brand-green disc is the *selected* state only. Away from this tab the
 * glyph sits bare in the inactive tint, exactly like Home and More — a disc
 * that stayed green on every tab read as a permanently-lit button rather than
 * as the indicator of where you are.
 *
 * The wrapper keeps the disc's footprint whether or not it is painted, so
 * switching tabs never shifts the icon row or the labels under it.
 */
export function AiTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  /** The tab bar's inactive tint, used when the disc is not painted. */
  color: ColorValue;
  size: number;
}) {
  const colors = useThemeColors();
  const diameter = size + 14;

  return (
    <View
      className="items-center justify-center"
      style={{
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        backgroundColor: focused ? colors.brand : "transparent",
      }}
    >
      <Ionicons
        name="chatbubble-ellipses"
        size={size - 4}
        color={focused ? colors.onBrand : color}
      />
    </View>
  );
}
