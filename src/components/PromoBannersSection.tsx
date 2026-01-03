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
      className={`group relative overflow-hidden rounded-2xl p-4 md:p-5 text-left transition-shadow duration-300 hover:shadow-xl bg-gradient-to-br ${banner.gradient}`}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Content with parallax */}
      <motion.div
        style={{ x: contentX, y: contentY, transformStyle: "preserve-3d" }}
        className="relative z-10 flex flex-col h-full min-h-[100px] md:min-h-[120px]"
      >
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
      </motion.div>

      {/* Decorative circle with parallax */}
      <motion.div
        style={{ 
          x: useTransform(xSpring, [-0.5, 0.5], ["8px", "-8px"]),
          y: useTransform(ySpring, [-0.5, 0.5], ["8px", "-8px"]),
        }}
        className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl"
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
    <section className="py-8 bg-background">
      <div className="container px-4 md:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4"
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
