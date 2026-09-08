import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

type AuthPasswordFieldProps = Omit<TextInputProps, "secureTextEntry"> & {
  label: string;
  error?: string;
};

export function AuthPasswordField({ label, error, ...inputProps }: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const colors = useThemeColors();

  return (
    <View>
      <View
        className={
          error
            ? "flex-row items-center rounded-2xl border-2 border-red-400 bg-field dark:bg-field-dark px-4 py-2.5"
            : "flex-row items-center rounded-2xl border border-line dark:border-line-dark bg-field dark:bg-field-dark px-4 py-2.5"
        }
      >
        <View className="flex-1">
          <Text className="text-muted dark:text-muted-dark text-xs">{label}</Text>
          <TextInput
            className="text-content dark:text-content-dark text-base font-medium p-0 mt-0.5"
            placeholderTextColor={colors.icon}
            secureTextEntry={!visible}
            {...inputProps}
          />
        </View>
        <TouchableOpacity
          onPress={() => setVisible((prev) => !prev)}
          hitSlop={8}
          className="ml-2"
        >
          <Ionicons name={visible ? "eye-off" : "eye"} size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>
      {error ? <Text className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}
