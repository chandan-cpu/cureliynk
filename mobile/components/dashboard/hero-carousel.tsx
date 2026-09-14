import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import { HERO_SLIDES, type HeroSlide, type HeroSlideId } from "@/constants/heroSlides";
import type { SupportedLanguage } from "@/i18n";
import { useThemeColors } from "@/lib/theme";

const SIDE_MARGIN = 20;
const SLIDE_GAP = 12;
const AUTO_ADVANCE_MS = 4500;
const STANDARD_HEIGHT = 168;
const PLAIN_IMAGE_MAX_HEIGHT = 320;

function useSlideNavigation() {
  const router = useRouter();
  const { t } = useTranslation();

  return useCallback(
    (id: HeroSlideId) => {
      if (id === "askAi") {
        router.push("/ask-ai");
      } else if (id === "pregnancy") {
        router.push({
          pathname: "/doctors-results",
          params: { department: "Gynecology", title: t("dashboard.pregnancyCare.title") },
        });
      } else if (id === "insurance") {
        router.push("/health-insurance");
      }
    },
    [router, t],
  );
}

type HeroSlideCardProps = {
  slide: HeroSlide;
  index: number;
  scrollX: SharedValue<number>;
  slideWidth: number;
  containerHeight: number;
};

function HeroSlideCard({ slide, index, scrollX, slideWidth, containerHeight }: HeroSlideCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useSlideNavigation();
  const colors = useThemeColors();
  const step = slideWidth + SLIDE_GAP;

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * step, index * step, (index + 1) * step];
    const scale = interpolate(scrollX.value, inputRange, [0.94, 1, 0.94], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.7, 1, 0.7], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });

  let content;
  if (slide.plainImage) {
    // Already a fully-designed banner with its own text/CTA — shown uncropped
    // at its own aspect ratio, no overlay or injected copy on top of it.
    const resolvedImage =
      typeof slide.plainImage === "function"
        ? slide.plainImage(i18n.language as SupportedLanguage)
        : slide.plainImage;
    const cardHeight = Math.min(slideWidth / (slide.aspectRatio ?? 1), PLAIN_IMAGE_MAX_HEIGHT);
    content = (
      <View style={{ width: slideWidth, height: cardHeight, borderRadius: 20, overflow: "hidden", backgroundColor: colors.surface }}>
        <Image source={resolvedImage} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={150} />
      </View>
    );
  } else {
    const textBlock = (
      <>
        {slide.icon ? <Ionicons name={slide.icon} size={24} color="#FFFFFF" /> : null}
        <Text className="text-white text-lg font-bold mt-3">{t(`dashboard.hero.${slide.id}.title`)}</Text>
        <Text className="text-white/85 text-xs mt-1.5">{t(`dashboard.hero.${slide.id}.subtitle`)}</Text>
      </>
    );

    content = slide.image ? (
      <View style={{ width: slideWidth, height: STANDARD_HEIGHT, borderRadius: 20, overflow: "hidden" }}>
        <Image
          source={slide.image}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.75)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1, padding: 22, justifyContent: "flex-end" }}
        >
          {textBlock}
        </LinearGradient>
      </View>
    ) : (
      <LinearGradient
        colors={slide.gradient ?? ["#15803D", "#22C55E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: slideWidth, borderRadius: 20, padding: 22, minHeight: STANDARD_HEIGHT, justifyContent: "center" }}
      >
        {textBlock}
      </LinearGradient>
    );
  }

  return (
    <Animated.View style={[animatedStyle, { height: containerHeight, justifyContent: "center" }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => navigate(slide.id)}>
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function HeroCarousel() {
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = windowWidth - SIDE_MARGIN * 2;
  const step = slideWidth + SLIDE_GAP;

  const containerHeight = Math.max(
    STANDARD_HEIGHT,
    ...HERO_SLIDES.filter((s) => s.plainImage).map((s) =>
      Math.min(slideWidth / (s.aspectRatio ?? 1), PLAIN_IMAGE_MAX_HEIGHT),
    ),
  );

  const scrollX = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / step);
      setActiveIndex(Math.max(0, Math.min(index, HERO_SLIDES.length - 1)));
    },
    [step],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % HERO_SLIDES.length;
        scrollRef.current?.scrollTo({ x: next * step, animated: true });
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [step]);

  return (
    <Animated.View entering={FadeInDown.duration(450)} className="mt-4">
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: SIDE_MARGIN, gap: SLIDE_GAP }}
      >
        {HERO_SLIDES.map((slide, index) => (
          <HeroSlideCard
            key={slide.id}
            slide={slide}
            index={index}
            scrollX={scrollX}
            slideWidth={slideWidth}
            containerHeight={containerHeight}
          />
        ))}
      </Animated.ScrollView>

      <View className="flex-row items-center justify-center gap-2 mt-3">
        {HERO_SLIDES.map((_, index) => (
          <View
            key={index}
            className={
              index === activeIndex
                ? "w-6 h-2 rounded-full bg-brand-dark dark:bg-brand"
                : "w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"
            }
          />
        ))}
      </View>
    </Animated.View>
  );
}
