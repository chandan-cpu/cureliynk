import { Stack } from "expo-router";

/**
 * Hosts the (tabs) group plus full-screen pushes (doctors results, Ask AI,
 * and the other stub screens) as siblings — mirrors app-example/app/_layout.tsx's
 * Stack-containing-a-tabs-group shape. Only reachable once app/_layout.tsx's
 * Stack.Protected guard allows it.
 */
export default function DashboardLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
