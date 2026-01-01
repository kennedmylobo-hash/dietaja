import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, MapPin, MessageCircle } from "lucide-react";

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

const testimonialsData = [
  { 
    name: "Mariana S.", 
    role: "Advogada",
    quote: "Ter a alimentação pronta foi um cuidado que eu estava devendo comigo mesma.",
    location: "Vitória da Conquista"
  },
  { 
    name: "Carla R.", 
    role: "Empresária",
    quote: "Perdi 4kg no primeiro mês sem passar fome!",
    location: "Conquista"
  },
  { 
    name: "Juliana M.", 
    role: "Professora",
    quote: "Agora como melhor, gasto menos e sobra energia pra academia.",
    location: "Conquista"
  },
  { 
    name: "Patrícia", 
    role: "Mãe de 3",
    quote: "Com a correria do dia a dia, não sobrava tempo pra cozinhar. Agora como bem todo dia!",
    location: "Vitória da Conquista"
  },
  { 
    name: "Fernanda", 
    role: "Enfermeira",
    quote: "Trabalho em plantão e não tinha como manter dieta. Mudou minha vida!",
    location: "Conquista"
  },
];

type NotificationType = 'sale' | 'testimonial';

interface Notification {
  type: NotificationType;
  name: string;
  location: string;
  product?: string;
  time?: string;
  role?: string;
  quote?: string;
}

const SalesNotification = () => {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  const getPedidosHoje = () => {
    const hour = new Date().getHours();
    return Math.floor(8 + (hour * 1.2));
  };

  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      showRandomNotification();
    }, 5000);

    return () => clearTimeout(initialTimeout);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    const nextTimeout = setTimeout(() => {
      showRandomNotification();
    }, 15000 + Math.random() * 10000);

    return () => {
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
    };
  }, [isVisible, currentNotification]);

  const showRandomNotification = () => {
    const isTestimonial = Math.random() > 0.5;
    
    if (isTestimonial) {
      const randomIndex = Math.floor(Math.random() * testimonialsData.length);
      const testimonial = testimonialsData[randomIndex];
      setCurrentNotification({
        type: 'testimonial',
        name: testimonial.name,
        role: testimonial.role,
        quote: testimonial.quote,
        location: testimonial.location,
      });
    } else {
      const randomIndex = Math.floor(Math.random() * salesData.length);
      const sale = salesData[randomIndex];
      setCurrentNotification({
        type: 'sale',
        name: sale.name,
        product: sale.product,
        location: sale.location,
        time: sale.time,
      });
    }
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
                {currentNotification.type === 'sale' ? (
                  <ShoppingBag className="w-5 h-5 text-primary" />
                ) : (
                  <MessageCircle className="w-5 h-5 text-primary" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {currentNotification.type === 'sale' ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      {currentNotification.name} comprou
                    </p>
                    <p className="text-sm text-primary font-semibold truncate">
                      {currentNotification.product}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      {currentNotification.name} <span className="text-muted-foreground font-normal">• {currentNotification.role}</span>
                    </p>
                    <p className="text-sm text-foreground/80 italic line-clamp-2">
                      "{currentNotification.quote}"
                    </p>
                  </>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {currentNotification.location}
                    {currentNotification.type === 'sale' && ` • ${currentNotification.time}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {currentNotification.type === 'sale' ? 'Verificado' : 'Cliente real'}
              </p>
              <p className="text-xs font-medium text-primary">
                {currentNotification.type === 'sale' 
                  ? `${getPedidosHoje()} pedidos hoje`
                  : '⭐ 5 estrelas'
                }
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SalesNotification;
