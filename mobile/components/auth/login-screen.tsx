import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { GoogleIcon } from "@/components/auth/google-icon";
import { SocialIconButton } from "@/components/auth/social-icon-button";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";
import { ApiError } from "@/lib/api";
import { loginWithEmail, loginWithGoogle } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";

export function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { promptGoogleSignIn } = useGoogleSignIn();
  const { signIn } = useAuth();
  const colors = useThemeColors();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Enter a valid email";
    if (!password) errors.password = "Password is required";
    return errors;
  };

  const handleLoginError = (error: unknown) => {
    const message = error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
    Alert.alert("Login failed", message);
  };

  const handleLogin = async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await loginWithEmail(email.trim().toLowerCase(), password);
      signIn(user);
      router.replace("/home");
    } catch (error) {
      handleLoginError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await promptGoogleSignIn();
    if (result.type === "cancelled") return;
    if (result.type === "error") {
      Alert.alert("Google sign-in failed", result.message);
      return;
    }

    setSubmitting(true);
    try {
      const user = await loginWithGoogle(result.idToken);
      signIn(user);
      router.replace("/home");
    } catch (error) {
      handleLoginError(error);
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text className="text-content dark:text-content-dark text-2xl font-bold">{t("auth.login.title")}</Text>
          <Text className="text-muted dark:text-muted-dark text-sm mt-1">{t("auth.login.subtitle")}</Text>
        </View>

        <View className="mt-8 gap-4">
          <AuthTextField
            label={t("auth.login.emailLabel")}
            placeholder={t("auth.login.emailPlaceholder")}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={fieldErrors.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <AuthPasswordField
            label={t("auth.login.passwordLabel")}
            placeholder={t("auth.login.passwordPlaceholder")}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            autoComplete="current-password"
          />

          <TouchableOpacity
            className="self-end"
            onPress={() => Alert.alert(t("auth.login.forgotPassword"), "Password reset isn't available yet.")}
          >
            <Text className="text-brand-dark dark:text-brand text-xs font-semibold">
              {t("auth.login.forgotPassword")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={submitting}
          activeOpacity={0.85}
          className="items-center justify-center bg-brand-dark dark:bg-brand rounded-full py-4 mt-6"
          style={submitting ? { opacity: 0.7 } : undefined}
        >
          <Text className="text-white dark:text-[#052E16] text-base font-semibold">
            {submitting ? "..." : t("auth.login.submit")}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center gap-3 mt-6">
          <View className="flex-1 h-px bg-line dark:bg-line-dark" />
          <Text className="text-muted dark:text-muted-dark text-xs">{t("auth.login.or")}</Text>
          <View className="flex-1 h-px bg-line dark:bg-line-dark" />
        </View>

        <TouchableOpacity
          onPress={() => Alert.alert(t("auth.login.otp"), t("auth.login.otpComingSoon"))}
          activeOpacity={0.75}
          className="items-center justify-center rounded-full border border-line dark:border-line-dark bg-card dark:bg-card-dark py-4 mt-6"
        >
          <Text className="text-content dark:text-content-dark text-base font-semibold">{t("auth.login.otp")}</Text>
        </TouchableOpacity>

        <View className="flex-row gap-3 mt-4">
          <SocialIconButton onPress={handleGoogleSignIn} disabled={submitting}>
            <GoogleIcon size={22} />
          </SocialIconButton>
          <SocialIconButton variant="dark" disabled onPress={() => {}}>
            <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
          </SocialIconButton>
        </View>
      </View>

      <View className="items-center pb-6">
        <Text className="text-muted dark:text-muted-dark text-sm">
          {t("auth.login.newHere")}{" "}
          <Text
            className="text-brand-dark dark:text-brand font-semibold"
            onPress={() => router.push("/signup")}
          >
            {t("auth.login.createAccount")}
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
