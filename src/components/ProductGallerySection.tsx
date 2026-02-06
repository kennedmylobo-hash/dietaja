import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Droplet, Flame, UtensilsCrossed, MapPin } from "lucide-react";
import produtosVideo from "@/assets/produtos-detox-video.mp4";
import { useLandingContent } from "@/hooks/useLandingContent";

const defaultBadges = [
  { icon: "Droplet", label: "Sucos detox" },
  { icon: "Flame", label: "Sopas funcionais" },
  { icon: "UtensilsCrossed", label: "Marmitas congeladas" },
  { icon: "MapPin", label: "Produção local" },
];

const iconMap: Record<string, any> = { Droplet, Flame, UtensilsCrossed, MapPin };

const ProductGallerySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { content, isVisible } = useLandingContent("product_gallery");

  if (!isVisible) return null;

  const title = content?.title ?? "O que você recebe";
  const badgeLabel = content?.badge ?? "🌿 Produto Real";
  const videoUrl = content?.video_url ?? null;
  const badges = (content?.badges ?? defaultBadges).map((b: any) => ({
    icon: iconMap[b.icon] || Droplet,
    label: b.label,
  }));
  const footerText = content?.footer ?? "Produção semanal em Vitória da Conquista";

  return (
    <section ref={ref} className="py-12 md:py-16 lg:py-24 bg-background">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-6 md:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 sm:px-4 py-1.5 bg-sage-light text-sage-dark text-xs sm:text-sm font-medium rounded-full mb-4">
            {badgeLabel}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {title}
          </h2>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-card aspect-video">
            <video
              src={videoUrl || produtosVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              width={800}
              height={450}
              className="w-full h-full object-cover"
            />
          </div>

          <motion.div
            className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 sm:mt-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {badges.map(({ icon: Icon, label }: any) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-card border border-border rounded-full text-xs sm:text-sm text-foreground"
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                {label}
              </span>
            ))}
          </motion.div>

          <motion.p
            className="text-center text-muted-foreground mt-6 text-sm"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {footerText}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductGallerySection;
