import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Droplets, UtensilsCrossed, Salad, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";

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

interface BannerCardProps {
  banner: typeof banners[0];
  onClick: () => void;
}

const BannerCard = ({ banner, onClick, shouldPulse }: BannerCardProps & { shouldPulse: boolean }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = banner.icon;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 300 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const rotateX = useTransform(ySpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-5deg", "5deg"]);
  const contentX = useTransform(xSpring, [-0.5, 0.5], ["-4px", "4px"]);
  const contentY = useTransform(ySpring, [-0.5, 0.5], ["-4px", "4px"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      variants={itemVariants}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      animate={shouldPulse ? { 
        scale: [1, 1.03, 1],
        boxShadow: [
          "0 10px 15px -3px rgba(0,0,0,0.1)",
          "0 20px 25px -5px rgba(0,0,0,0.2)",
          "0 10px 15px -3px rgba(0,0,0,0.1)"
        ]
      } : {}}
      transition={shouldPulse ? { 
        duration: 0.8, 
        ease: "easeInOut",
        repeat: 2,
        repeatDelay: 0.3
      } : {}}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 text-left transition-all duration-300 shadow-lg hover:shadow-2xl ring-2 ring-white/20 hover:ring-white/40 bg-gradient-to-br ${banner.gradient} cursor-pointer`}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Content with parallax */}
      <motion.div
        style={{ x: contentX, y: contentY, transformStyle: "preserve-3d" }}
        className="relative z-10 flex flex-col h-full min-h-[70px] sm:min-h-[110px] md:min-h-[160px] lg:min-h-[180px]"
      >
        <Icon className="w-5 h-5 sm:w-7 sm:h-7 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white/90 mb-1.5 sm:mb-2 md:mb-3" />
        
        <h3 className="text-[11px] sm:text-base md:text-lg lg:text-xl font-bold text-white leading-tight">
          {banner.title}
        </h3>
        
        <p className="hidden sm:block text-sm md:text-base text-white/80 font-medium mt-1.5">
          {banner.subtitle}
        </p>
        
        <p className="hidden sm:block text-xs md:text-sm text-white/70 mt-auto pt-3">
          {banner.description}
        </p>
      </motion.div>

      {/* Click indicator */}
      <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-center gap-1 text-white/60 group-hover:text-white transition-all duration-300">
        <span className="text-[10px] sm:text-xs hidden sm:inline font-medium">Ver mais</span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform duration-300" />
      </div>

      {/* Decorative circle with parallax */}
      <motion.div
        style={{ 
          x: useTransform(xSpring, [-0.5, 0.5], ["8px", "-8px"]),
          y: useTransform(ySpring, [-0.5, 0.5], ["8px", "-8px"]),
        }}
        className="absolute -right-4 -bottom-4 sm:-right-6 sm:-bottom-6 w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white/15 rounded-full blur-2xl"
      />
    </motion.button>
  );
};

const PromoBannersSection = () => {
  const [shouldPulse, setShouldPulse] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldPulse(true);
      // Stop pulsing after animation completes
      setTimeout(() => setShouldPulse(false), 3500);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-4 sm:py-6 md:py-12 bg-background">
      <div className="container px-3 md:px-6">
        {/* Section header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-4 sm:mb-6 md:mb-8"
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            O que você deseja?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Clique e veja mais 👇
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-2 sm:gap-5 lg:gap-6"
          style={{ perspective: "1000px" }}
        >
          {banners.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              shouldPulse={shouldPulse}
              onClick={() => scrollToSection(banner.targetSection)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PromoBannersSection;
