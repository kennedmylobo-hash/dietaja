import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

export interface LandingHeroProps {
  category: 'detox' | 'fit' | 'fitness';
  title: string;
  subtitle: string;
  benefits: string[];
  badgeText: string;
  badgeEmoji: string;
  accentColor?: 'primary' | 'terracotta' | 'blue';
  imageUrl?: string;
  videoUrl?: string;
  onScrollToMenu?: () => void;
}

const LandingHero = ({
  title,
  subtitle,
  benefits,
  badgeText,
  badgeEmoji,
  accentColor = 'primary',
  imageUrl,
  videoUrl,
  onScrollToMenu,
}: LandingHeroProps) => {
  const colorClasses = {
    primary: {
      badge: "bg-primary/10 text-primary border-primary/20",
      icon: "text-primary",
      gradient: "from-primary/20 to-transparent",
    },
    terracotta: {
      badge: "bg-terracotta/10 text-terracotta border-terracotta/20",
      icon: "text-terracotta",
      gradient: "from-terracotta/20 to-transparent",
    },
    blue: {
      badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      icon: "text-blue-500",
      gradient: "from-blue-500/20 to-transparent",
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background">
      {/* Background decoration */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-50`} />
      
      <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Badge */}
            <Badge variant="outline" className={`${colors.badge} px-3 py-1.5`}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {badgeEmoji} {badgeText}
            </Badge>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground">
              {subtitle}
            </p>

            {/* Benefits */}
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5`}>
                    <Check className={`w-3 h-3 ${colors.icon}`} />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </motion.li>
              ))}
            </ul>

            {/* Ver Cardápio Button */}
            {onScrollToMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <Button
                  onClick={onScrollToMenu}
                  variant="outline"
                  size="lg"
                  className="group border-2 hover:bg-primary/5"
                >
                  Ver Cardápio 👇
                  <ChevronDown className="ml-2 w-4 h-4 group-hover:translate-y-1 transition-transform" />
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Image or Video */}
          {(imageUrl || videoUrl) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {/* Decorative elements */}
              <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br ${colors.gradient} rounded-full blur-2xl`} />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
