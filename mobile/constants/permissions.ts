import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

import type { DevicePermissionId } from "@/lib/permissions";

export type PermissionOption = {
  id: DevicePermissionId;
  icon: ComponentProps<typeof Ionicons>["name"];
  badgeColor: string;
};

export const PERMISSION_OPTIONS: PermissionOption[] = [
  { id: "location", icon: "location", badgeColor: "#2563EB" },
  { id: "camera", icon: "camera", badgeColor: "#7C3AED" },
  { id: "notifications", icon: "notifications", badgeColor: "#D97706" },
  { id: "microphone", icon: "mic", badgeColor: "#DB2777" },
];
