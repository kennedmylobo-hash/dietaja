import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Gift, Clock } from "lucide-react";

const PromoCouponBanner = () => {
  const [promoCoupon, setPromoCoupon] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [remainingUses, setRemainingUses] = useState(37); // Scarcity number

  useEffect(() => {
    const coupon = localStorage.getItem('promo_coupon');
    if (coupon) {
      setPromoCoupon(coupon);
      // Randomize remaining uses for scarcity (between 12 and 43)
      const seed = coupon.charCodeAt(0) + new Date().getDate();
      setRemainingUses(12 + (seed % 32));
    }
  }, []);

  if (!promoCoupon || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 text-white"
      >
        <div className="container px-4 py-3 flex items-center justify-center gap-3 relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
          >
            <Gift className="w-5 h-5 flex-shrink-0" />
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center">
            <span className="font-bold text-sm sm:text-base">
              🎉 Cupom <span className="bg-white/20 px-2 py-0.5 rounded font-mono">{promoCoupon}</span> resgatado!
            </span>
            <span className="text-xs sm:text-sm opacity-90">
              15% OFF no seu pedido
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold bg-red-500/80 px-2 py-0.5 rounded-full animate-pulse">
              <Clock className="w-3 h-3" />
              Restam {remainingUses} usos
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PromoCouponBanner;
