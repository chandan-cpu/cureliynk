import { Text, View } from "react-native";

/** "Rituraj Das" → "RD". Falls back to a single letter, then to nothing. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type IdentityCardProps = {
  name: string;
  /** Age · gender · blood group when known, otherwise the contact detail. */
  meta: string;
};

export function IdentityCard({ name, meta }: IdentityCardProps) {
  return (
    <View className="flex-row items-center gap-3.5 rounded-2xl border border-line dark:border-line-dark bg-card dark:bg-card-dark p-[15px]">
      <View className="h-[50px] w-[50px] flex-none items-center justify-center rounded-full bg-brand-dark/10 dark:bg-brand/15">
        <Text className="text-lg font-semibold text-brand-dark dark:text-brand">
          {initialsOf(name)}
        </Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-base font-semibold text-content dark:text-content-dark">{name}</Text>
        {meta ? (
          <Text className="mt-[3px] text-[12.5px] text-muted dark:text-muted-dark">{meta}</Text>
        ) : null}
      </View>
    </View>
  );
}
