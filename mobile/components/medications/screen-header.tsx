import type { ComponentProps, ReactNode } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional right-hand action, e.g. an "add" button. */
  action?: ReactNode;
};

/** Back arrow + title row shared by the four reminder screens. */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View className="flex-row items-center gap-2 px-5 pt-2 pb-3">
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={12}
        className="w-10 h-10 items-center justify-center -ml-2"
      >
        <Ionicons name="arrow-back" size={24} color={colors.content} />
      </TouchableOpacity>

      <View className="flex-1">
        <Text className="text-content dark:text-content-dark text-lg font-bold">{title}</Text>
        {subtitle ? (
          <Text className="text-muted dark:text-muted-dark text-xs mt-0.5">{subtitle}</Text>
        ) : null}
      </View>

      {action}
    </View>
  );
}

type HeaderIconButtonProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  accessibilityLabel: string;
};

export function HeaderIconButton({ icon, onPress, accessibilityLabel }: HeaderIconButtonProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="w-10 h-10 rounded-full items-center justify-center bg-brand/10"
    >
      <Ionicons name={icon} size={20} color={colors.brand} />
    </TouchableOpacity>
  );
}
