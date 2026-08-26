import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";

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
   *  being cropped into the shared landscape frame. */
  plainImage?: ImageSourcePropType;
  /** Width/height ratio of `plainImage`, used to size its card without cropping. */
  aspectRatio?: number;
};

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
    plainImage: require("@/assets/b3.jpg"),
    aspectRatio: 1086 / 1448,
  },
];
