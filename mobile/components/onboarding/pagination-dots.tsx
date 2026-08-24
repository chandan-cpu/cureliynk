import { View } from "react-native";

type PaginationDotsProps = {
  /** Total number of onboarding steps. */
  total: number;
  /** Zero-based index of the step currently shown. */
  activeIndex: number;
};

/**
 * Step indicator shown under the onboarding copy. The active step renders
 * as a wider pill; the rest render as small neutral dots.
 */
export function PaginationDots({ total, activeIndex }: PaginationDotsProps) {
  return (
    <View className="flex-row items-center gap-2">
      {Array.from({ length: total }, (_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            className={
              isActive
                ? "w-6 h-2 rounded-full bg-brand"
                : "w-2 h-2 rounded-full bg-white/20"
            }
          />
        );
      })}
    </View>
  );
}
