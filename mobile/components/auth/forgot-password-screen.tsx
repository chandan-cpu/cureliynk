import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { ApiError } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth";
import { useThemeColors } from "@/lib/theme";

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError(t("auth.forgotPassword.emailRequired"));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setEmailError(t("auth.forgotPassword.emailInvalid"));
      return;
    }

    setEmailError(undefined);
    setFormError(undefined);
    setSubmitting(true);
    try {
      await requestPasswordReset(trimmed.toLowerCase());
      setSent(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("auth.forgotPassword.genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-card dark:bg-surface-dark">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-brand-dark/10 dark:bg-brand/10 items-center justify-center mb-4">
            <Ionicons name="mail-outline" size={28} color={colors.brand} />
          </View>
          <Text className="text-content dark:text-content-dark text-xl font-bold text-center">
            {t("auth.forgotPassword.sentTitle")}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-sm text-center mt-2">
            {t("auth.forgotPassword.sentSubtitle", { email: email.trim() })}
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/login")}
            activeOpacity={0.85}
            className="items-center justify-center bg-brand-dark dark:bg-brand rounded-full py-4 px-8 mt-8"
          >
            <Text className="text-white dark:text-[#052E16] text-base font-semibold">
              {t("auth.forgotPassword.backToLogin")}
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
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color={colors.content} />
        </TouchableOpacity>

        <View className="items-center mt-2">
          <Text className="text-content dark:text-content-dark text-2xl font-bold">
            {t("auth.forgotPassword.title")}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-sm mt-1 text-center">
            {t("auth.forgotPassword.subtitle")}
          </Text>
        </View>

        <View className="mt-8 gap-2">
          <AuthTextField
            label={t("auth.forgotPassword.emailLabel")}
            placeholder={t("auth.forgotPassword.emailPlaceholder")}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (emailError) setEmailError(undefined);
              if (formError) setFormError(undefined);
            }}
            error={emailError}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          {formError ? <Text className="text-red-500 dark:text-red-400 text-xs ml-1">{formError}</Text> : null}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
          className="items-center justify-center bg-brand-dark dark:bg-brand rounded-full py-4 mt-6"
          style={submitting ? { opacity: 0.7 } : undefined}
        >
          <Text className="text-white dark:text-[#052E16] text-base font-semibold">
            {submitting ? "..." : t("auth.forgotPassword.submit")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
