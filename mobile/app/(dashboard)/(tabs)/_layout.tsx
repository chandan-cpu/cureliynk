import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiTabIcon } from "@/components/dashboard/ai-tab-icon";
import { useThemeColors } from "@/lib/theme";

export default function DashboardTabsLayout() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          // The middle tab's disc is taller than a bare glyph, so the bar is
          // given the extra room explicitly. Setting `height` opts out of the
          // navigator's own inset handling, hence the manual bottom padding.
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      {/* Ask AI sits in the middle so it is reachable from every tab — this
          replaces the floating button that used to hover over the bar. */}
      <Tabs.Screen
        name="ask-ai"
        options={{
          title: t("tabs.askAi"),
          tabBarIcon: ({ focused, color, size }) => (
            <AiTabIcon focused={focused} color={color} size={size} />
          ),
          // The chat gives the keyboard the whole screen height, the way a
          // dedicated chat surface does — a bar under the composer would just
          // be a strip of dead space between the input and the keys. The
          // header's back arrow is what leads out of here.
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t("tabs.more"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
