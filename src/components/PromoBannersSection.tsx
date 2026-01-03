import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Droplets, UtensilsCrossed, Salad } from "lucide-react";
import { useRef } from "react";

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

const BannerCard = ({ banner, onClick }: BannerCardProps) => {
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
      className={`flex-shrink-0 w-[85%] snap-center sm:w-auto sm:flex-shrink group relative overflow-hidden rounded-2xl p-4 md:p-6 lg:p-8 text-left transition-shadow duration-300 shadow-lg hover:shadow-2xl ring-1 ring-white/10 bg-gradient-to-br ${banner.gradient}`}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Content with parallax */}
      <motion.div
        style={{ x: contentX, y: contentY, transformStyle: "preserve-3d" }}
        className="relative z-10 flex flex-col h-full min-h-[110px] md:min-h-[160px] lg:min-h-[180px]"
      >
        <Icon className="w-7 h-7 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white/90 mb-2 md:mb-3" />
        
        <h3 className="text-base md:text-lg lg:text-xl font-bold text-white leading-tight">
          {banner.title}
        </h3>
        
        <p className="text-sm md:text-base text-white/80 font-medium mt-1.5">
          {banner.subtitle}
        </p>
        
        <p className="text-xs md:text-sm text-white/70 mt-auto pt-3">
          {banner.description}
        </p>
      </motion.div>

      {/* Decorative circle with parallax */}
      <motion.div
        style={{ 
          x: useTransform(xSpring, [-0.5, 0.5], ["8px", "-8px"]),
          y: useTransform(ySpring, [-0.5, 0.5], ["8px", "-8px"]),
        }}
        className="absolute -right-6 -bottom-6 w-28 h-28 md:w-32 md:h-32 bg-white/15 rounded-full blur-2xl"
      />
    </motion.button>
  );
};

const PromoBannersSection = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-6 md:py-12 bg-background">
      <div className="container px-3 md:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 sm:grid sm:grid-cols-3 sm:gap-5 lg:gap-6 sm:overflow-visible scrollbar-hide"
          style={{ perspective: "1000px" }}
        >
          {banners.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              onClick={() => scrollToSection(banner.targetSection)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PromoBannersSection;
