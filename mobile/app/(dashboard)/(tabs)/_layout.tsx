import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { FloatingAiButton } from "@/components/dashboard/floating-ai-button";
import { colors } from "@/constants/colors";

export default function DashboardTabsLayout() {
  return (
    <View className="flex-1 bg-surface">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand.dark,
          tabBarInactiveTintColor: "#94A3B8",
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
