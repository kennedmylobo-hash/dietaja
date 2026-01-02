import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, MessageCircle } from "lucide-react";

const testimonialsData = [
  { 
    name: "Mariana S.", 
    role: "Advogada",
    quote: "Ter a alimentação pronta foi um cuidado que eu estava devendo comigo mesma.",
    location: "Vitória da Conquista"
  },
  { 
    name: "Rafael T.", 
    role: "Engenheiro",
    quote: "Trabalho home office e agora como bem todo dia sem esforço.",
    location: "Conquista"
  },
  { 
    name: "Juliana M.", 
    role: "Professora",
    quote: "Agora como melhor, gasto menos e sobra energia pra academia.",
    location: "Conquista"
  },
  { 
    name: "Carlos A.", 
    role: "Representante",
    quote: "Chego de viagem e a comida saudável já está pronta!",
    location: "Vitória da Conquista"
  },
  { 
    name: "Fernanda", 
    role: "Enfermeira",
    quote: "Trabalho em plantão e não tinha como manter dieta. Mudou minha vida!",
    location: "Conquista"
  },
  { 
    name: "Bruno M.", 
    role: "Personal Trainer",
    quote: "Indico pra todos os meus alunos. Qualidade top!",
    location: "Conquista"
  },
];

interface Testimonial {
  name: string;
  location: string;
  role: string;
  quote: string;
}

const SalesNotification = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState<Testimonial | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      showRandomTestimonial();
    }, 5000);

    return () => clearTimeout(initialTimeout);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    const nextTimeout = setTimeout(() => {
      showRandomTestimonial();
    }, 15000 + Math.random() * 10000);

    return () => {
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
    };
  }, [isVisible, currentTestimonial]);

  const showRandomTestimonial = () => {
    const randomIndex = Math.floor(Math.random() * testimonialsData.length);
    setCurrentTestimonial(testimonialsData[randomIndex]);
    setIsVisible(true);
  };

  return (
    <AnimatePresence>
      {isVisible && currentTestimonial && (
        <motion.div
          initial={{ opacity: 0, x: -100, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 z-40 max-w-[300px] md:bottom-8 md:left-8"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {currentTestimonial.name} <span className="text-muted-foreground font-normal">• {currentTestimonial.role}</span>
                </p>
                <p className="text-sm text-foreground/80 italic line-clamp-2">
                  "{currentTestimonial.quote}"
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {currentTestimonial.location}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Cliente real
              </p>
              <p className="text-xs font-medium text-primary">
                ⭐ 5 estrelas
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SalesNotification;
