import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";

import { useThemeColors } from "@/lib/theme";

type SettingsRowProps = {
  label: string;
  /** Trailing detail — a count, or the current setting. */
  value?: string;
  onPress: () => void;
  /** Every row but the first in a group draws its own top divider. */
  divided: boolean;
};

export function SettingsRow({ label, value, onPress, divided }: SettingsRowProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className={`flex-row items-center gap-3 px-[15px] py-3.5 ${
        divided ? "border-t border-line dark:border-line-dark" : ""
      }`}
    >
      <Text className="flex-1 min-w-0 text-[14.5px] text-content dark:text-content-dark">{label}</Text>
      {value ? (
        <Text className="flex-none text-[12.5px] text-muted dark:text-muted-dark">{value}</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.icon} />
    </TouchableOpacity>
  );
}
