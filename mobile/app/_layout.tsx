import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { restorePersistedLanguage } from "@/i18n";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";
import { ThemeProvider } from "@/lib/theme-context";

export default function RootLayout() {
  useEffect(() => {
    restorePersistedLanguage();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        {/* "auto" flips the bar contents with the active theme, so every screen
            gets a readable status bar without setting one of its own. */}
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Protected guard={status === "authenticated"}>
        <Stack.Screen name="(dashboard)" />
      </Stack.Protected>
    </Stack>
  );
}
