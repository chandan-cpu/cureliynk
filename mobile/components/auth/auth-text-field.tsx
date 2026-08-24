import { Text, TextInput, TextInputProps, View } from "react-native";

type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthTextField({ label, error, ...inputProps }: AuthTextFieldProps) {
  return (
    <View>
      <View
        className={
          error
            ? "rounded-2xl border-2 border-red-400 bg-slate-50 px-4 py-2.5"
            : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5"
        }
      >
        <Text className="text-slate-500 text-xs">{label}</Text>
        <TextInput
          className="text-slate-900 text-base font-medium p-0 mt-0.5"
          placeholderTextColor="#94A3B8"
          {...inputProps}
        />
      </View>
      {error ? <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}
