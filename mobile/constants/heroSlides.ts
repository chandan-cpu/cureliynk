import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";

import type { SupportedLanguage } from "@/i18n";

export type HeroSlideId = "askAi" | "pregnancy" | "insurance";

export type HeroSlide = {
  id: HeroSlideId;
  icon?: ComponentProps<typeof Ionicons>["name"];
  /** Solid gradient background — used only when neither `image` nor `plainImage` is set. */
  gradient?: [string, string];
  /** Photo background rendered under a dark gradient overlay, with the slide's
   *  icon/title/subtitle drawn on top. */
  image?: ImageSourcePropType;
  /** A fully-designed banner with its own text/CTA already baked in — rendered
   *  as-is (no overlay, no injected text) at its own aspect ratio instead of
   *  being cropped into the shared landscape frame. Can depend on the app's
   *  current language, e.g. a banner with baked-in translated copy. */
  plainImage?: ImageSourcePropType | ((language: SupportedLanguage) => ImageSourcePropType);
  /** Width/height ratio of `plainImage`, used to size its card without cropping. */
  aspectRatio?: number;
};

/** The insurance banner has its copy baked into the image, so it needs one
 *  asset per language rather than a translation string. Only Assamese has a
 *  dedicated version today; every other supported language falls back to
 *  the English banner. */
function insuranceBanner(language: SupportedLanguage): ImageSourcePropType {
  return language === "as"
    ? require("@/assets/banner-assames.jpg")
    : require("@/assets/banner-english.jpg");
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "askAi",
    icon: "sparkles",
    image: require("@/assets/b1.jpg"),
  },
  {
    id: "pregnancy",
    icon: "heart",
    image: require("@/assets/b2.jpg"),
  },
  {
    id: "insurance",
    plainImage: insuranceBanner,
    aspectRatio: 1300 / 732,
  },
];
