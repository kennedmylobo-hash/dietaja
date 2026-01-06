import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  targetSection: string;
  gradient: string;
}

const banners: Banner[] = [
  {
    id: 1,
    title: "Sem tempo pra cozinhar?",
    subtitle: "Marmitas saudáveis congeladas, prontas em 3 minutos. Escolha seus sabores favoritos!",
    cta: "Ver Marmitas",
    targetSection: "carnes",
    gradient: "from-emerald-800/90 via-emerald-700/80 to-green-600/70",
  },
  {
    id: 2,
    title: "Alimentação Saudável",
    subtitle: "Kits Detox completos com sucos naturais e sopas funcionais para emagrecer com saúde.",
    cta: "Ver Kits Detox",
    targetSection: "kits",
    gradient: "from-green-900/90 via-green-800/80 to-emerald-700/70",
  },
  {
    id: 3,
    title: "Pronto em 3 minutos!",
    subtitle: "Do freezer para o prato. Refeições completas de 300g com todo sabor e nutrientes.",
    cta: "Explorar Cardápio",
    targetSection: "frangos",
    gradient: "from-teal-800/90 via-teal-700/80 to-green-600/70",
  },
];

const HeroBanners = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center" },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="py-4">
      <div className="relative">
        {/* Carousel */}
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {banners.map((banner) => (
              <div key={banner.id} className="flex-[0_0_100%] min-w-0">
                <div
                  className={cn(
                    "relative h-[180px] sm:h-[220px] md:h-[260px] rounded-2xl overflow-hidden",
                    "bg-gradient-to-r",
                    banner.gradient
                  )}
                >
                  {/* Background Pattern */}
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath d='M40 10c-8 12-24 18-36 14 8 14 22 20 36 16-14 8-18 22-14 36 14-8 20-22 16-36 8 14 22 18 36 14-14-8-20-22-16-36-8 14-22 18-36 14 14-8 18-22 14-36z' fill='%23ffffff' fill-opacity='0.15'/%3E%3C/svg%3E")`,
                      backgroundSize: '80px 80px',
                    }}
                  />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-center px-6 sm:px-10 md:px-16 max-w-2xl">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 drop-shadow-lg">
                      {banner.title}
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg text-white/90 mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-none">
                      {banner.subtitle}
                    </p>
                    <Button
                      onClick={() => scrollToSection(banner.targetSection)}
                      className="w-fit bg-white text-green-800 hover:bg-green-50 font-semibold shadow-lg"
                      size="lg"
                    >
                      {banner.cta}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows - Desktop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={scrollPrev}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg text-green-800"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={scrollNext}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg text-green-800"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                selectedIndex === index
                  ? "bg-primary w-8"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Ir para banner ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBanners;
