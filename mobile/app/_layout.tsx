import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { restorePersistedLanguage } from "@/i18n";
import { AuthProvider, useAuth } from "@/lib/auth-context";

export default function RootLayout() {
  useEffect(() => {
    restorePersistedLanguage();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A1A2F" },
      }}
    >
      <Stack.Protected guard={status === "authenticated"}>
        <Stack.Screen name="(dashboard)" />
      </Stack.Protected>
    </Stack>
  );
}
