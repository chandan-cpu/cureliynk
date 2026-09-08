import { useTranslation } from "react-i18next";
import { Text, type TextProps } from "react-native";

/**
 * Devanagari and Bengali/Assamese glyphs carry matras above and below the
 * baseline, so the design gives every Indic string noticeably more leading
 * than the Latin equivalent. Same rule here, keyed off the active language.
 */
export function useIndicScript(): boolean {
  const { i18n } = useTranslation();
  return i18n.language === "hi" || i18n.language === "bn" || i18n.language === "as";
}

type BoldMarkedTextProps = TextProps & {
  /** Copy where `**…**` marks the phrase the design sets in semibold. */
  children: string;
};

/**
 * Renders one translated string with `**bold**` spans.
 *
 * The design bolds the specialty and the deadline mid-sentence ("see a
 * **cardiologist within 24 hours**"). Keeping the marker inside the
 * translation lets each language put the emphasis where its own grammar wants
 * it, instead of forcing every locale to split the sentence the English way.
 */
export function BoldMarkedText({ children, ...props }: BoldMarkedTextProps) {
  const segments = children.split("**");
  return (
    <Text {...props}>
      {segments.map((segment, index) =>
        // Odd indices are the spans that sat between a pair of markers.
        index % 2 === 1 ? (
          <Text key={index} className="font-semibold">
            {segment}
          </Text>
        ) : (
          segment
        ),
      )}
    </Text>
  );
}
