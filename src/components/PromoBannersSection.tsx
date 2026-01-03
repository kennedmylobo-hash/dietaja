import { motion } from "framer-motion";
import { Droplets, UtensilsCrossed, Salad, Truck } from "lucide-react";

const banners = [
  {
    id: "kit-detox",
    title: "Kit Detox 3 Dias",
    subtitle: "Comece sua transformação",
    description: "12 sucos + 6 sopas",
    icon: Droplets,
    gradient: "from-primary/90 to-primary",
    targetSection: "kits",
  },
  {
    id: "marmitas",
    title: "Marmitas Saudáveis",
    subtitle: "Ganhe até 23% OFF",
    description: "Combos de 7 a 28 marmitas",
    icon: UtensilsCrossed,
    gradient: "from-terracotta/90 to-terracotta",
    targetSection: "marmitas",
  },
  {
    id: "dieta",
    title: "Dieta Personalizada",
    subtitle: "Montamos para você",
    description: "Sua dieta, nossa mão de obra",
    icon: Salad,
    gradient: "from-sage-dark/90 to-sage-dark",
    targetSection: "dieta-personalizada",
  },
  {
    id: "frete",
    title: "Retirada Grátis",
    subtitle: "No Recreio - VCA",
    description: "Ou entrega por R$10",
    icon: Truck,
    gradient: "from-muted-foreground/80 to-muted-foreground",
    targetSection: "checkout",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const PromoBannersSection = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-8 bg-background">
      <div className="container px-4 md:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {banners.map((banner) => {
            const Icon = banner.icon;

            return (
              <motion.button
                key={banner.id}
                variants={itemVariants}
                onClick={() => scrollToSection(banner.targetSection)}
                className={`group relative overflow-hidden rounded-2xl p-4 md:p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-br ${banner.gradient}`}
              >
                {/* Background glow effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full min-h-[100px] md:min-h-[120px]">
                  <Icon className="w-6 h-6 md:w-8 md:h-8 text-white/90 mb-2" />
                  
                  <h3 className="text-sm md:text-base font-bold text-white leading-tight">
                    {banner.title}
                  </h3>
                  
                  <p className="text-xs md:text-sm text-white/80 font-medium mt-1">
                    {banner.subtitle}
                  </p>
                  
                  <p className="text-[10px] md:text-xs text-white/60 mt-auto pt-2">
                    {banner.description}
                  </p>
                </div>

                {/* Decorative circle */}
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default PromoBannersSection;
