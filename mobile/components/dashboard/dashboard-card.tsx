import type { ReactNode } from "react";
import { View } from "react-native";

type DashboardCardProps = {
  children: ReactNode;
  className?: string;
};

/** Shared card chrome reused by every dashboard card section. */
export function DashboardCard({ children, className = "" }: DashboardCardProps) {
  return (
    <View
      className={`rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-4 shadow-sm ${className}`}
    >
      {children}
    </View>
  );
}
