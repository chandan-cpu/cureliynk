import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/auth";
import { useThemeColors } from "@/lib/theme";

// Mirrors the server-side rule in server/src/validators/auth.validators.js.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^]).{8,}$/;

type FieldErrors = Partial<Record<"password" | "confirmPassword", string>>;

export function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!PASSWORD_RULE.test(password)) {
      errors.password = t("auth.resetPassword.passwordRule");
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = t("auth.resetPassword.mismatch");
    }
    return errors;
  };

  const handleSubmit = async () => {
    if (!token) return;

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      Alert.alert(t("auth.resetPassword.successTitle"), t("auth.resetPassword.successMessage"), [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("auth.resetPassword.genericError");
      Alert.alert(t("auth.resetPassword.failTitle"), message);
    } finally {
      setSubmitting(false);
    }
  };

  // Reached without a token when someone opens the screen directly rather
  // than through the emailed link — nothing to submit against.
  if (!token) {
    return (
      <SafeAreaView className="flex-1 bg-card dark:bg-surface-dark">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={40} color={colors.muted} />
          <Text className="text-content dark:text-content-dark text-lg font-bold text-center mt-4">
            {t("auth.resetPassword.invalidLinkTitle")}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-sm text-center mt-2">
            {t("auth.resetPassword.invalidLinkSubtitle")}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/forgot-password")}
            activeOpacity={0.85}
            className="items-center justify-center bg-brand-dark dark:bg-brand rounded-full py-4 px-8 mt-8"
          >
            <Text className="text-white dark:text-[#052E16] text-base font-semibold">
              {t("auth.resetPassword.requestNewLink")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-card dark:bg-surface-dark">
      <View className="flex-1 px-6 pt-2">
        <TouchableOpacity
          onPress={() => router.replace("/login")}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color={colors.content} />
        </TouchableOpacity>

        <View className="items-center mt-2">
          <Text className="text-content dark:text-content-dark text-2xl font-bold">
            {t("auth.resetPassword.title")}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-sm mt-1 text-center">
            {t("auth.resetPassword.subtitle")}
          </Text>
        </View>

        <View className="mt-8 gap-4">
          <AuthPasswordField
            label={t("auth.resetPassword.passwordLabel")}
            placeholder={t("auth.resetPassword.passwordPlaceholder")}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            autoComplete="new-password"
          />

          <AuthPasswordField
            label={t("auth.resetPassword.confirmPasswordLabel")}
            placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
          className="items-center justify-center bg-brand-dark dark:bg-brand rounded-full py-4 mt-6"
          style={submitting ? { opacity: 0.7 } : undefined}
        >
          <Text className="text-white dark:text-[#052E16] text-base font-semibold">
            {submitting ? "..." : t("auth.resetPassword.submit")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
