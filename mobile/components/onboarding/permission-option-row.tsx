import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import type { PermissionOption } from "@/constants/permissions";

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
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={pending}
      className={
        granted
          ? "flex-row items-center rounded-2xl border-2 border-brand bg-brand/5 px-4 py-3.5"
          : "flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
      }
    >
      <View
        className="w-11 h-11 rounded-full items-center justify-center"
        style={{ backgroundColor: option.badgeColor }}
      >
        <Ionicons name={option.icon} size={20} color="#FFFFFF" />
      </View>

      <View className="flex-1 ml-3">
        <Text className="text-slate-900 text-base font-semibold">{title}</Text>
        <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {pending ? (
        <ActivityIndicator size="small" color="#22C55E" />
      ) : (
        <View
          className={
            granted
              ? "w-6 h-6 rounded-full bg-brand items-center justify-center"
              : "w-6 h-6 rounded-full border-2 border-slate-300"
          }
        >
          {granted ? <Text className="text-white text-xs font-bold">✓</Text> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}
