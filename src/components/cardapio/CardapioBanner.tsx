import { useState, useEffect } from "react";
import { Clock, Truck, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

const getEndOfDay = (): Date => {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};

const calculateTimeLeft = (): TimeLeft => {
  const now = new Date();
  const target = getEndOfDay();
  const difference = target.getTime() - now.getTime();
  
  if (difference <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  
  return {
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

const CardapioBanner = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground overflow-hidden"
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine" />
        
        <div className="container mx-auto px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
            {/* Promo text */}
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="font-semibold text-sm sm:text-base">
                FRETE GRÁTIS
              </span>
              <span className="text-xs sm:text-sm opacity-90">
                para retirada
              </span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-primary-foreground/30" />

            {/* Countdown */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-xs sm:text-sm opacity-90">Oferta termina em:</span>
              <div className="flex items-center gap-1 font-mono font-bold text-sm sm:text-base">
                <span className="bg-primary-foreground/20 px-1.5 py-0.5 rounded">
                  {timeLeft.hours.toString().padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="bg-primary-foreground/20 px-1.5 py-0.5 rounded">
                  {timeLeft.minutes.toString().padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="bg-primary-foreground/20 px-1.5 py-0.5 rounded">
                  {timeLeft.seconds.toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Delivery info - desktop only */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-px h-5 bg-primary-foreground/30" />
              <Truck className="h-4 w-4" />
              <span className="text-xs sm:text-sm">
                Entrega: +R$ 10
              </span>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default CardapioBanner;
