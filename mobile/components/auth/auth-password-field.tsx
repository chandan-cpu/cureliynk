import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";

type AuthPasswordFieldProps = Omit<TextInputProps, "secureTextEntry"> & {
  label: string;
  error?: string;
};

export function AuthPasswordField({ label, error, ...inputProps }: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <View
        className={
          error
            ? "flex-row items-center rounded-2xl border-2 border-red-400 bg-slate-50 px-4 py-2.5"
            : "flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5"
        }
      >
        <View className="flex-1">
          <Text className="text-slate-500 text-xs">{label}</Text>
          <TextInput
            className="text-slate-900 text-base font-medium p-0 mt-0.5"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!visible}
            {...inputProps}
          />
        </View>
        <TouchableOpacity
          onPress={() => setVisible((prev) => !prev)}
          hitSlop={8}
          className="ml-2"
        >
          <Ionicons name={visible ? "eye-off" : "eye"} size={20} color="#64748B" />
        </TouchableOpacity>
      </View>
      {error ? <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}
