import { useState, useEffect, useRef, RefObject } from "react";
import { useInView } from "framer-motion";
import Autoplay from "embla-carousel-autoplay";
import type { CarouselApi } from "@/components/ui/carousel";

interface UseCarouselWithProgressOptions {
  autoplayDelay?: number;
}

interface UseCarouselWithProgressReturn {
  api: CarouselApi | undefined;
  setApi: (api: CarouselApi) => void;
  current: number;
  count: number;
  progress: number;
  isPlaying: boolean;
  autoplayPlugin: ReturnType<typeof Autoplay>;
  isHoveringDots: boolean;
  setIsHoveringDots: (value: boolean) => void;
}

export function useCarouselWithProgress(
  sectionRef: RefObject<HTMLElement>,
  options: UseCarouselWithProgressOptions = {}
): UseCarouselWithProgressReturn {
  const { autoplayDelay = 3000 } = options;

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHoveringDots, setIsHoveringDots] = useState(false);

  const isSectionVisible = useInView(sectionRef, { margin: "-50px" });

  const autoplayPlugin = useRef(
    Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    })
  );

  // Sincronizar estado do carrossel
  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
      setProgress(0);
    };

    // Sincronizar isPlaying com eventos do plugin
    const onAutoplayPlay = () => setIsPlaying(true);
    const onAutoplayStop = () => setIsPlaying(false);

    api.on("select", onSelect);
    api.on("autoplay:play" as any, onAutoplayPlay);
    api.on("autoplay:stop" as any, onAutoplayStop);

    return () => {
      api.off("select", onSelect);
      api.off("autoplay:play" as any, onAutoplayPlay);
      api.off("autoplay:stop" as any, onAutoplayStop);
    };
  }, [api]);

  // Pausar/retomar autoplay baseado na visibilidade
  useEffect(() => {
    if (!autoplayPlugin.current || !api) return;

    const hasSlides = api.scrollSnapList().length > 0;

    if (isSectionVisible && hasSlides) {
      autoplayPlugin.current.play();
    } else {
      autoplayPlugin.current.stop();
    }
  }, [isSectionVisible, api]);

  // Barra de progresso com CSS animation sync
  useEffect(() => {
    if (!isPlaying || !isSectionVisible || isHoveringDots) {
      return;
    }

    const startTime = Date.now();
    let animationFrame: number;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / autoplayDelay) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, isSectionVisible, isHoveringDots, current, autoplayDelay]);

  // Pausar autoplay quando hover nos dots
  useEffect(() => {
    if (!autoplayPlugin.current || !api) return;

    const hasSlides = api.scrollSnapList().length > 0;

    if (isHoveringDots) {
      autoplayPlugin.current.stop();
    } else if (isSectionVisible && hasSlides) {
      autoplayPlugin.current.play();
    }
  }, [isHoveringDots, isSectionVisible, api]);

  return {
    api,
    setApi,
    current,
    count,
    progress,
    isPlaying,
    autoplayPlugin: autoplayPlugin.current,
    isHoveringDots,
    setIsHoveringDots,
  };
}
