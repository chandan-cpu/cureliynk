import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/medications/screen-header";
import { fetchDoseLogs, type AdherenceSummary, type DoseLog } from "@/lib/medications";
import { useThemeColors } from "@/lib/theme";

const DAYS_SHOWN = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; logs: DoseLog[]; summary: AdherenceSummary };

/** Local YYYY-MM-DD, the key the calendar groups by. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** What one calendar cell shows: the worst outcome of that day's doses. */
type DayOutcome = "none" | "taken" | "partial" | "missed";

export function AdherenceHistoryScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [state, setState] = useState<State>({ status: "loading" });

  /** Returns the next state rather than setting it, so the caller owns cancellation. */
  const loadState = useCallback(async (): Promise<State> => {
    const to = new Date();
    const from = new Date(to.getTime() - (DAYS_SHOWN - 1) * MS_PER_DAY);
    from.setHours(0, 0, 0, 0);

    try {
      const result = await fetchDoseLogs({ from, to });
      return { status: "ready", logs: result.doseLogs, summary: result.summary };
    } catch {
      return { status: "error" };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadState().then((next) => {
      // Dropped when the user navigated away mid-request.
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [loadState]);

  const days = useMemo(() => {
    if (state.status !== "ready") return [];

    const byDay = new Map<string, DoseLog[]>();
    for (const log of state.logs) {
      const key = dayKey(new Date(log.scheduledAt));
      const existing = byDay.get(key);
      if (existing) existing.push(log);
      else byDay.set(key, [log]);
    }

    // Oldest first, so the grid reads left-to-right like a calendar.
    const today = new Date();
    return Array.from({ length: DAYS_SHOWN }, (_, index) => {
      const date = new Date(today.getTime() - (DAYS_SHOWN - 1 - index) * MS_PER_DAY);
      const logs = byDay.get(dayKey(date)) ?? [];

      const answered = logs.filter((log) => log.status === "taken" || log.status === "missed");
      const takenCount = answered.filter((log) => log.status === "taken").length;

      let outcome: DayOutcome = "none";
      if (answered.length > 0) {
        if (takenCount === answered.length) outcome = "taken";
        else if (takenCount === 0) outcome = "missed";
        else outcome = "partial";
      }

      return { date, outcome, total: logs.length };
    });
  }, [state]);

  const outcomeColor = (outcome: DayOutcome): string => {
    if (outcome === "taken") return colors.accentGreen;
    if (outcome === "missed") return colors.danger;
    if (outcome === "partial") return colors.accentAmber;
    return colors.line;
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <ScreenHeader title={t("medications.history.title")} subtitle={t("medications.history.last30")} />

      {state.status === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : state.status === "error" ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Ionicons name="cloud-offline-outline" size={40} color={colors.icon} />
          <Text className="text-muted dark:text-muted-dark text-sm text-center">
            {t("medications.errors.load")}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10">
          <View className="flex-row gap-3">
            <StatTile
              label={t("medications.history.adherenceRate")}
              value={state.summary.adherenceRate === null ? "—" : `${state.summary.adherenceRate}%`}
              tint={colors.brand}
            />
            <StatTile
              label={t("medications.history.taken")}
              value={String(state.summary.taken)}
              tint={colors.accentGreen}
            />
            <StatTile
              label={t("medications.history.missed")}
              value={String(state.summary.missed)}
              tint={colors.danger}
            />
          </View>

          {state.summary.total === 0 ? (
            <View className="items-center justify-center gap-3 pt-20">
              <Ionicons name="calendar-outline" size={40} color={colors.icon} />
              <Text className="text-muted dark:text-muted-dark text-sm text-center">
                {t("medications.history.empty")}
              </Text>
            </View>
          ) : (
            <View className="rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-4 mt-4">
              {/* A 30-cell grid rather than a month view: the range is always
                  "the last 30 days", so month boundaries would only add
                  empty leading cells with nothing to say. */}
              <View className="flex-row flex-wrap gap-2">
                {days.map(({ date, outcome, total }) => (
                  <View
                    key={date.toISOString()}
                    accessibilityLabel={`${dayKey(date)}: ${outcome}`}
                    className="w-9 h-9 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor:
                        outcome === "none" ? "transparent" : `${outcomeColor(outcome)}26`,
                      borderWidth: 1,
                      borderColor: outcomeColor(outcome),
                    }}
                  >
                    <Text
                      className="text-[10px] font-semibold"
                      style={{ color: outcome === "none" ? colors.muted : outcomeColor(outcome) }}
                    >
                      {date.getDate()}
                    </Text>
                    {total > 0 ? (
                      <Text className="text-[8px]" style={{ color: colors.muted }}>
                        {total}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap gap-3 mt-4">
                <Legend color={colors.accentGreen} label={t("medications.history.taken")} />
                <Legend color={colors.accentAmber} label={t("medications.today.pending")} />
                <Legend color={colors.danger} label={t("medications.history.missed")} />
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatTile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-3">
      <Text className="text-xl font-bold" style={{ color: tint }}>
        {value}
      </Text>
      <Text className="text-muted dark:text-muted-dark text-[11px] mt-0.5" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="w-3 h-3 rounded" style={{ backgroundColor: `${color}26`, borderWidth: 1, borderColor: color }} />
      <Text className="text-muted dark:text-muted-dark text-[11px]">{label}</Text>
    </View>
  );
}
