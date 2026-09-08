import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { FloatingAiButton } from "@/components/dashboard/floating-ai-button";
import { useThemeColors } from "@/lib/theme";

export default function DashboardTabsLayout() {
  const colors = useThemeColors();

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.icon,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.line,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="ellipsis-horizontal-circle" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <FloatingAiButton />
    </View>
  );
}
