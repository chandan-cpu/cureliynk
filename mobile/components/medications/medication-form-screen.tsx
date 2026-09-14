import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/medications/screen-header";
import {
  MEDICATION_FORMS,
  createMedication,
  createSchedule,
  deleteMedication as deleteMedicationRequest,
  fetchMedications,
  fetchSchedules,
  updateMedication,
  updateSchedule,
  type MedicationForm,
  type ScheduleFrequency,
} from "@/lib/medications";
import { cancelRemindersForSchedule } from "@/lib/notification-scheduler";
import { useThemeColors } from "@/lib/theme";

const FREQUENCIES: ScheduleFrequency[] = ["daily", "every_n_hours", "weekly"];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** "HH:mm", the only format the backend and the scheduler accept. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type LoadState = "loading" | "ready" | "saving";

/**
 * Add/edit a medication together with its schedule.
 *
 * The two are one form because a medication with no schedule never reminds
 * anyone — splitting them would let someone finish "adding a medicine" and get
 * nothing. They are still two documents, so saving writes both.
 */
export function MedicationFormScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [loadState, setLoadState] = useState<LoadState>(isEditing ? "loading" : "ready");
  const [error, setError] = useState<string | null>(null);

  // Medication fields
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState<MedicationForm>("tablet");
  const [quantity, setQuantity] = useState("30");
  const [threshold, setThreshold] = useState("5");

  // Schedule fields
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [intervalHours, setIntervalHours] = useState("6");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [startDate] = useState(() => new Date());

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        // Both lists are small and already cached server-side; fetching them
        // together avoids a dedicated "one medication with its schedule"
        // endpoint that nothing else would use.
        const [medications, schedules] = await Promise.all([fetchMedications(), fetchSchedules()]);
        if (cancelled) return;

        const medication = medications.find((item) => item._id === id);
        if (!medication) {
          setError(t("medications.errors.load"));
          setLoadState("ready");
          return;
        }

        setName(medication.name);
        setDosage(medication.dosage);
        setForm(medication.form);
        setQuantity(String(medication.quantityRemaining));
        setThreshold(String(medication.lowStockThreshold));

        const schedule = schedules.find((item) => item.medicationId === id);
        if (schedule) {
          setScheduleId(schedule._id);
          setFrequency(schedule.frequency);
          if (schedule.timeOfDay.length > 0) setTimes(schedule.timeOfDay);
          if (schedule.intervalHours) setIntervalHours(String(schedule.intervalHours));
          if (schedule.daysOfWeek.length > 0) setDaysOfWeek(schedule.daysOfWeek);
        }

        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setError(t("medications.errors.load"));
          setLoadState("ready");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const validationError = useMemo(() => {
    if (!name.trim()) return t("medications.form.nameRequired");
    if (!dosage.trim()) return t("medications.form.dosageRequired");

    if (frequency !== "every_n_hours") {
      const valid = times.filter((time) => TIME_PATTERN.test(time));
      if (valid.length === 0) return t("medications.form.timesRequired");
    }

    if (frequency === "weekly" && daysOfWeek.length === 0) {
      return t("medications.form.daysRequired");
    }

    return null;
  }, [name, dosage, frequency, times, daysOfWeek, t]);

  const handleSave = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoadState("saving");
    setError(null);

    try {
      const medicationPayload = {
        name: name.trim(),
        dosage: dosage.trim(),
        form,
        quantityRemaining: Number(quantity) || 0,
        lowStockThreshold: Number(threshold) || 0,
      };

      const medication = isEditing && id
        ? await updateMedication(id, medicationPayload)
        : await createMedication(medicationPayload);

      // Only the fields this frequency actually uses are sent; the others stay
      // at their schema defaults so a schedule switched from weekly to daily
      // does not keep stale daysOfWeek.
      const schedulePayload = {
        frequency,
        timeOfDay: frequency === "every_n_hours" ? [] : times.filter((time) => TIME_PATTERN.test(time)),
        intervalHours: frequency === "every_n_hours" ? Number(intervalHours) || 6 : undefined,
        daysOfWeek: frequency === "weekly" ? daysOfWeek : [],
        startDate: startDate.toISOString(),
        isActive: true,
      };

      if (scheduleId) {
        // Reminders are rebuilt from scratch on the next load, but the old
        // ones are cancelled here so an edited time cannot fire once more
        // before that happens.
        await cancelRemindersForSchedule(scheduleId);
        await updateSchedule(scheduleId, schedulePayload);
      } else {
        await createSchedule({ ...schedulePayload, medicationId: medication._id });
      }

      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("medications.errors.save"));
      setLoadState("ready");
    }
  };

  const handleDelete = () => {
    if (!id) return;

    Alert.alert(t("medications.form.deleteTitle"), t("medications.form.deleteBody"), [
      { text: t("medications.form.cancel"), style: "cancel" },
      {
        text: t("medications.form.confirmDelete"),
        style: "destructive",
        onPress: async () => {
          try {
            if (scheduleId) await cancelRemindersForSchedule(scheduleId);
            await deleteMedicationRequest(id);
            router.back();
          } catch {
            setError(t("medications.errors.save"));
          }
        },
      },
    ]);
  };

  if (loadState === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
        <ScreenHeader title={t("medications.form.editTitle")} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <ScreenHeader
        title={isEditing ? t("medications.form.editTitle") : t("medications.form.addTitle")}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
          <Field label={t("medications.form.name")}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("medications.form.namePlaceholder")}
              placeholderTextColor={colors.icon}
              className="bg-field dark:bg-field-dark text-content dark:text-content-dark rounded-xl px-4 py-3 text-sm"
            />
          </Field>

          <Field label={t("medications.form.dosage")}>
            <TextInput
              value={dosage}
              onChangeText={setDosage}
              placeholder={t("medications.form.dosagePlaceholder")}
              placeholderTextColor={colors.icon}
              className="bg-field dark:bg-field-dark text-content dark:text-content-dark rounded-xl px-4 py-3 text-sm"
            />
          </Field>

          <Field label={t("medications.form.formLabel")}>
            <View className="flex-row flex-wrap gap-2">
              {MEDICATION_FORMS.map((option) => (
                <Chip
                  key={option}
                  label={t(`medications.forms.${option}`)}
                  selected={form === option}
                  onPress={() => setForm(option)}
                />
              ))}
            </View>
          </Field>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label={t("medications.form.quantity")}>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.icon}
                  className="bg-field dark:bg-field-dark text-content dark:text-content-dark rounded-xl px-4 py-3 text-sm"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label={t("medications.form.threshold")}>
                <TextInput
                  value={threshold}
                  onChangeText={setThreshold}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.icon}
                  className="bg-field dark:bg-field-dark text-content dark:text-content-dark rounded-xl px-4 py-3 text-sm"
                />
              </Field>
            </View>
          </View>

          <Text className="text-content dark:text-content-dark text-base font-bold mt-4 mb-1">
            {t("medications.form.scheduleTitle")}
          </Text>

          <Field label={t("medications.form.frequency")}>
            <View className="flex-row flex-wrap gap-2">
              {FREQUENCIES.map((option) => (
                <Chip
                  key={option}
                  label={t(
                    `medications.form.${option === "every_n_hours" ? "everyNHours" : option}`,
                  )}
                  selected={frequency === option}
                  onPress={() => setFrequency(option)}
                />
              ))}
            </View>
          </Field>

          {frequency === "every_n_hours" ? (
            <Field label={t("medications.form.interval")}>
              <TextInput
                value={intervalHours}
                onChangeText={setIntervalHours}
                keyboardType="number-pad"
                placeholderTextColor={colors.icon}
                className="bg-field dark:bg-field-dark text-content dark:text-content-dark rounded-xl px-4 py-3 text-sm"
              />
            </Field>
          ) : (
            <Field label={t("medications.form.times")}>
              {times.map((time, index) => (
                <View key={index} className="flex-row items-center gap-2 mb-2">
                  <TextInput
                    value={time}
                    onChangeText={(value) =>
                      setTimes((current) =>
                        current.map((entry, position) => (position === index ? value : entry)),
                      )
                    }
                    placeholder="08:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    placeholderTextColor={colors.icon}
                    className="flex-1 bg-field dark:bg-field-dark text-content dark:text-content-dark rounded-xl px-4 py-3 text-sm"
                  />
                  {times.length > 1 ? (
                    <TouchableOpacity
                      onPress={() =>
                        setTimes((current) => current.filter((_, position) => position !== index))
                      }
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Ionicons name="close-circle" size={22} color={colors.icon} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}

              <TouchableOpacity
                onPress={() => setTimes((current) => [...current, "20:00"])}
                className="flex-row items-center gap-1.5 self-start mt-1"
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
                <Text className="text-xs font-semibold" style={{ color: colors.brand }}>
                  {t("medications.form.addTime")}
                </Text>
              </TouchableOpacity>
            </Field>
          )}

          {frequency === "weekly" ? (
            <Field label={t("medications.form.days")}>
              <View className="flex-row flex-wrap gap-2">
                {WEEKDAY_KEYS.map((key, index) => (
                  <Chip
                    key={key}
                    label={t(`medications.weekdays.${key}`)}
                    selected={daysOfWeek.includes(index)}
                    onPress={() =>
                      setDaysOfWeek((current) =>
                        current.includes(index)
                          ? current.filter((day) => day !== index)
                          : [...current, index].sort(),
                      )
                    }
                  />
                ))}
              </View>
            </Field>
          ) : null}

          {error ? (
            <Text className="text-xs mt-2" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleSave}
            disabled={loadState === "saving"}
            className="bg-brand-dark dark:bg-brand rounded-full py-3.5 items-center mt-5"
            style={{ opacity: loadState === "saving" ? 0.6 : 1 }}
          >
            <Text className="text-white dark:text-[#052E16] text-sm font-bold">
              {loadState === "saving" ? t("medications.form.saving") : t("medications.form.save")}
            </Text>
          </TouchableOpacity>

          {isEditing ? (
            <TouchableOpacity onPress={handleDelete} className="py-3.5 items-center mt-1">
              <Text className="text-sm font-semibold" style={{ color: colors.danger }}>
                {t("medications.form.delete")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="text-muted dark:text-muted-dark text-xs font-semibold mb-2">{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full px-3.5 py-2 border ${
        selected
          ? "bg-brand-dark dark:bg-brand border-transparent"
          : "border-line dark:border-line-dark"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          selected ? "text-white dark:text-[#052E16]" : "text-content dark:text-content-dark"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
