import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import type { PermissionOption } from "@/constants/permissions";
import { useThemeColors } from "@/lib/theme";

type PermissionOptionRowProps = {
  option: PermissionOption;
  title: string;
  subtitle: string;
  granted: boolean;
  pending: boolean;
  onPress: () => void;
};

export function PermissionOptionRow({
  option,
  title,
  subtitle,
  granted,
  pending,
  onPress,
}: PermissionOptionRowProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={pending}
      className={
        granted
          ? "flex-row items-center rounded-2xl border-2 border-brand bg-brand/5 px-4 py-3.5"
          : "flex-row items-center rounded-2xl border border-line dark:border-line-dark bg-card dark:bg-card-dark px-4 py-3.5"
      }
    >
      <View
        className="w-11 h-11 rounded-full items-center justify-center"
        style={{ backgroundColor: option.badgeColor }}
      >
        <Ionicons name={option.icon} size={20} color="#FFFFFF" />
      </View>

      <View className="flex-1 ml-3">
        <Text className="text-content dark:text-content-dark text-base font-semibold">{title}</Text>
        <Text className="text-muted dark:text-muted-dark text-xs mt-0.5" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {pending ? (
        <ActivityIndicator size="small" color={colors.brand} />
      ) : (
        <View
          className={
            granted
              ? "w-6 h-6 rounded-full bg-brand items-center justify-center"
              : "w-6 h-6 rounded-full border-2 border-line dark:border-line-dark"
          }
        >
          {granted ? <Text className="text-white text-xs font-bold">✓</Text> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}
