import { motion } from "framer-motion";
import { ChevronRight, Clock, Truck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const banners = [
  {
    id: 1,
    title: "Sem tempo pra cozinhar saudável?",
    subtitle: "Experimente nossas refeições congeladas, a solução prática e saudável para sua rotina agitada!",
    cta: "Peça Já",
    targetSection: "marmitas",
    gradient: "from-primary/90 via-primary to-emerald-700",
    badge: null,
    icon: Clock,
  },
  {
    id: 2,
    title: "Alimentação Saudável",
    subtitle: "Em poucos cliques! Kits detox com sucos e sopas prontos para consumo.",
    cta: "Ver Kits",
    targetSection: "kits",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    badge: "Kits Detox",
    icon: null,
  },
  {
    id: 3,
    title: "Pronto em 3 minutos",
    subtitle: "Marmitas congeladas de 300g. Pague com PIX ou Cartão.",
    cta: "Explorar",
    targetSection: "marmitas",
    gradient: "from-amber-600 via-orange-600 to-red-600",
    badge: "300g",
    icon: CreditCard,
  },
];

const HeroBanners = () => {
  const autoplayPlugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="py-4 md:py-6">
      {/* Desktop: Grid Layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {banners.map((banner, index) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${banner.gradient} p-6 min-h-[200px] flex flex-col justify-between cursor-pointer group`}
            onClick={() => scrollToSection(banner.targetSection)}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white rounded-full blur-2xl" />
              <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white rounded-full blur-xl" />
            </div>

            {/* Badge */}
            {banner.badge && (
              <span className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                {banner.badge}
              </span>
            )}

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
              {banner.icon && (
                <banner.icon className="h-8 w-8 text-white/80 mb-2" />
              )}
              <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                {banner.title}
              </h3>
              <p className="text-white/80 text-sm leading-relaxed flex-1">
                {banner.subtitle}
              </p>
            </div>

            {/* CTA */}
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-fit bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm group-hover:translate-x-1 transition-transform"
            >
              {banner.cta}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Mobile: Carousel */}
      <div className="md:hidden">
        <Carousel
          opts={{ loop: true, align: "start" }}
          plugins={[autoplayPlugin.current]}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {banners.map((banner) => (
              <CarouselItem key={banner.id} className="pl-2 basis-[92%]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${banner.gradient} p-5 min-h-[160px] flex flex-col justify-between`}
                  onClick={() => scrollToSection(banner.targetSection)}
                >
                  {/* Background decoration */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white rounded-full blur-2xl" />
                  </div>

                  {/* Badge */}
                  {banner.badge && (
                    <span className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {banner.badge}
                    </span>
                  )}

                  {/* Content */}
                  <div className="relative z-10">
                    {banner.icon && (
                      <banner.icon className="h-6 w-6 text-white/80 mb-1.5" />
                    )}
                    <h3 className="text-lg font-bold text-white mb-1 leading-tight">
                      {banner.title}
                    </h3>
                    <p className="text-white/80 text-xs leading-relaxed line-clamp-2">
                      {banner.subtitle}
                    </p>
                  </div>

                  {/* CTA */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-fit bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm text-xs py-1 h-7"
                  >
                    {banner.cta}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Carousel indicators */}
        <div className="flex justify-center gap-1.5 mt-3">
          {banners.map((_, index) => (
            <div
              key={index}
              className="w-1.5 h-1.5 rounded-full bg-primary/30"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBanners;
