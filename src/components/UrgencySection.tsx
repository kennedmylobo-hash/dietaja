import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import { siteConfig, formatCurrency } from "@/config/site";

const UrgencySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 md:py-16 lg:py-20 bg-background">
      <div className="container px-4 md:px-6">
        <motion.div 
          className="max-w-2xl mx-auto space-y-4 sm:space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Local */}
          <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-sage-light/50 border border-primary/20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm sm:text-base">
                {siteConfig.location.city}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                📍 Retirada grátis • 🛵 Entrega {formatCurrency(siteConfig.location.deliveryFee)}
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="bg-card/50 rounded-xl border border-border p-4 sm:p-6 flex flex-col items-center">
            <CountdownTimer />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default UrgencySection;
