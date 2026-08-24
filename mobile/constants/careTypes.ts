import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type CareTypeOption = {
  id: "personal" | "family" | "women" | "elder";
  icon: ComponentProps<typeof Ionicons>["name"];
  badgeColor: string;
};

export const CARE_TYPE_OPTIONS: CareTypeOption[] = [
  { id: "personal", icon: "person", badgeColor: "#2563EB" },
  { id: "family", icon: "people", badgeColor: "#D97706" },
  { id: "women", icon: "female", badgeColor: "#DB2777" },
  { id: "elder", icon: "accessibility", badgeColor: "#64748B" },
];

/** Matches the care type selected by default in the design mockup. */
export const DEFAULT_CARE_TYPE_ID: CareTypeOption["id"] = "women";
