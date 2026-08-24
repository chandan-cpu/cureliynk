import type { ReactNode } from "react";
import { TouchableOpacity } from "react-native";

type SocialIconButtonProps = {
  children: ReactNode;
  onPress: () => void;
  variant?: "light" | "dark";
  disabled?: boolean;
};

export function SocialIconButton({
  children,
  onPress,
  variant = "light",
  disabled,
}: SocialIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      className={
        variant === "dark"
          ? "flex-1 items-center justify-center rounded-2xl bg-slate-900 py-3.5"
          : "flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white py-3.5"
      }
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {children}
    </TouchableOpacity>
  );
}
