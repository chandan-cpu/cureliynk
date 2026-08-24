import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { ApiError } from "@/lib/api";
import { registerUser } from "@/lib/auth";

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^]).{8,}$/;

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "password", string>>;

export function SignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (name.trim().length < 2) errors.name = "Name must be at least 2 characters";
    if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Enter a valid email";
    if (phone && !/^[6-9]\d{9}$/.test(phone)) errors.phone = "Enter a valid 10-digit mobile number";
    if (!PASSWORD_RULE.test(password)) {
      errors.password = "8+ chars with upper, lower, number & special character";
    }
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      Alert.alert("Account created", "You can now log in with your new account.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
      Alert.alert("Sign up failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-2"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View className="items-center mt-2">
          <Text className="text-slate-900 text-2xl font-bold">{t("auth.signup.title")}</Text>
          <Text className="text-slate-500 text-sm mt-1">{t("auth.signup.subtitle")}</Text>
        </View>

        <View className="mt-8 gap-4">
          <AuthTextField
            label={t("auth.signup.nameLabel")}
            placeholder={t("auth.signup.namePlaceholder")}
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={fieldErrors.name}
            autoCapitalize="words"
            autoComplete="name"
          />

          <AuthTextField
            label={t("auth.signup.emailLabel")}
            placeholder={t("auth.signup.emailPlaceholder")}
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

          <AuthTextField
            label={t("auth.signup.phoneLabel")}
            placeholder={t("auth.signup.phonePlaceholder")}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            error={fieldErrors.phone}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <AuthPasswordField
            label={t("auth.signup.passwordLabel")}
            placeholder={t("auth.signup.passwordPlaceholder")}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
          className="items-center justify-center bg-brand-dark rounded-full py-4 mt-8"
          style={submitting ? { opacity: 0.7 } : undefined}
        >
          <Text className="text-white text-base font-semibold">
            {submitting ? "..." : t("auth.signup.submit")}
          </Text>
        </TouchableOpacity>

        <View className="items-center mt-6">
          <Text className="text-slate-500 text-sm">
            {t("auth.signup.alreadyHaveAccount")}{" "}
            <Text className="text-brand-dark font-semibold" onPress={() => router.replace("/login")}>
              {t("auth.signup.login")}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
