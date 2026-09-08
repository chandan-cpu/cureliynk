import { Text, TextInput, TextInputProps, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthTextField({ label, error, ...inputProps }: AuthTextFieldProps) {
  const colors = useThemeColors();

  return (
    <View>
      <View
        className={
          error
            ? "rounded-2xl border-2 border-red-400 bg-field dark:bg-field-dark px-4 py-2.5"
            : "rounded-2xl border border-line dark:border-line-dark bg-field dark:bg-field-dark px-4 py-2.5"
        }
      >
        <Text className="text-muted dark:text-muted-dark text-xs">{label}</Text>
        <TextInput
          className="text-content dark:text-content-dark text-base font-medium p-0 mt-0.5"
          placeholderTextColor={colors.icon}
          {...inputProps}
        />
      </View>
      {error ? <Text className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}
