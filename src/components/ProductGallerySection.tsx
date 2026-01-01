import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Droplet, Flame, UtensilsCrossed, MapPin } from "lucide-react";
import produtosVideo from "@/assets/produtos-detox-video.mp4";

const badges = [
  { icon: Droplet, label: "Sucos detox" },
  { icon: Flame, label: "Sopas funcionais" },
  { icon: UtensilsCrossed, label: "Marmitas congeladas" },
  { icon: MapPin, label: "Produção local" },
];

const sopas = [
  { emoji: "🟠", nome: "Abóbora termogênica", ingredientes: "com gengibre" },
  { emoji: "⚪", nome: "Aipim cremoso", ingredientes: "com alho-poró" },
  { emoji: "🟢", nome: "Batata-doce", ingredientes: "com couve e chuchu" },
];

const sucos = [
  { emoji: "🟢", nome: "Verde", ingredientes: "abacaxi, couve e gengibre" },
  { emoji: "🩷", nome: "Rosa", ingredientes: "melancia com hortelã" },
  { emoji: "🟡", nome: "Amarelo", ingredientes: "manga com cenoura" },
  { emoji: "🔴", nome: "Vermelho", ingredientes: "morango com hortelã" },
];

const ProductGallerySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24 bg-background">
      <div className="container px-6">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 bg-sage-light text-sage-dark text-sm font-medium rounded-full mb-4">
            🌿 Produto Real
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            O que você recebe
          </h2>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-card">
            <video
              src={produtosVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              className="w-full h-auto object-cover"
            />
          </div>

          <motion.div
            className="flex flex-wrap justify-center gap-3 mt-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {badges.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm text-foreground"
              >
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </span>
            ))}
          </motion.div>

          {/* Sabores Section */}
          <motion.div
            className="grid md:grid-cols-2 gap-4 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* Sopas */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                🍲 Sopas Funcionais
                <span className="text-xs font-normal text-muted-foreground">(3 sabores)</span>
              </h3>
              <ul className="space-y-2">
                {sopas.map((sopa) => (
                  <li key={sopa.nome} className="flex items-start gap-2 text-sm">
                    <span className="text-base leading-none mt-0.5">{sopa.emoji}</span>
                    <span>
                      <span className="font-medium text-foreground">{sopa.nome}</span>
                      <span className="text-muted-foreground"> {sopa.ingredientes}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sucos */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                🧃 Sucos Detox
                <span className="text-xs font-normal text-muted-foreground">(4 sabores)</span>
              </h3>
              <ul className="space-y-2">
                {sucos.map((suco) => (
                  <li key={suco.nome} className="flex items-start gap-2 text-sm">
                    <span className="text-base leading-none mt-0.5">{suco.emoji}</span>
                    <span>
                      <span className="font-medium text-foreground">{suco.nome}</span>
                      <span className="text-muted-foreground"> ({suco.ingredientes})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.p
            className="text-center text-muted-foreground mt-6 text-sm"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            Produção semanal em Vitória da Conquista
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductGallerySection;
