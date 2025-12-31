import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, MapPin } from "lucide-react";

const salesData = [
  { name: "Ana Paula", location: "Vitória da Conquista", product: "Kit Detox 5 Dias", time: "agora" },
  { name: "Fernanda", location: "Conquista", product: "Kit Detox 7 Dias", time: "2 min atrás" },
  { name: "Luciana", location: "Vitória da Conquista", product: "Kit Detox 3 Dias", time: "5 min atrás" },
  { name: "Patrícia", location: "Conquista", product: "Kit Detox 5 Dias + Marmitas", time: "8 min atrás" },
  { name: "Camila", location: "Vitória da Conquista", product: "Kit Detox 7 Dias", time: "12 min atrás" },
  { name: "Beatriz", location: "Conquista", product: "Kit Detox 5 Dias", time: "15 min atrás" },
  { name: "Renata", location: "Vitória da Conquista", product: "Kit Detox 3 Dias", time: "18 min atrás" },
  { name: "Daniela", location: "Conquista", product: "Kit Detox 5 Dias + Marmitas", time: "22 min atrás" },
];

const SalesNotification = () => {
  const [currentNotification, setCurrentNotification] = useState<typeof salesData[0] | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Contador de pedidos do dia (simulado baseado na hora)
  const getPedidosHoje = () => {
    const hour = new Date().getHours();
    return Math.floor(8 + (hour * 1.2)); // Aumenta ao longo do dia
  };

  useEffect(() => {
    // Show first notification after 5 seconds
    const initialTimeout = setTimeout(() => {
      showRandomNotification();
    }, 5000);

    return () => clearTimeout(initialTimeout);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Hide notification after 4 seconds
    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    // Show next notification after 15-25 seconds
    const nextTimeout = setTimeout(() => {
      showRandomNotification();
    }, 15000 + Math.random() * 10000);

    return () => {
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
    };
  }, [isVisible, currentNotification]);

  const showRandomNotification = () => {
    const randomIndex = Math.floor(Math.random() * salesData.length);
    setCurrentNotification(salesData[randomIndex]);
    setIsVisible(true);
  };

  return (
    <AnimatePresence>
      {isVisible && currentNotification && (
        <motion.div
          initial={{ opacity: 0, x: -100, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 z-40 max-w-[300px] md:bottom-8 md:left-8"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {currentNotification.name} comprou
                </p>
                <p className="text-sm text-primary font-semibold truncate">
                  {currentNotification.product}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {currentNotification.location} • {currentNotification.time}
                  </span>
                </div>
              </div>
            </div>

            {/* Contador de pedidos */}
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Verificado
              </p>
              <p className="text-xs font-medium text-primary">
                {getPedidosHoje()} pedidos hoje
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SalesNotification;
