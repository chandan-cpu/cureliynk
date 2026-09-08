import type { ReactNode } from "react";
import { Text, View } from "react-native";

/**
 * A titled group of rows sharing one rounded card, the way the design splits
 * the screen into health record / activity / settings.
 */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text className="mx-0.5 mb-[9px] text-xs font-semibold text-muted dark:text-muted-dark">
        {title}
      </Text>
      <View className="overflow-hidden rounded-[14px] border border-line dark:border-line-dark bg-card dark:bg-card-dark">
        {children}
      </View>
    </View>
  );
}
