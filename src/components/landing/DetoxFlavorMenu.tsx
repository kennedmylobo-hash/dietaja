import { motion } from "framer-motion";
import { useKitSoups, useKitJuices } from "@/hooks/useMenuData";

const DetoxFlavorMenu = () => {
  const { data: soups = [] } = useKitSoups();
  const { data: juices = [] } = useKitJuices();

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            🍃 O que você recebe
          </h2>
          <p className="text-muted-foreground">
            Sucos e sopas funcionais para renovar seu corpo
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Juices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-xl p-5 border"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🧃</span>
              <h3 className="font-semibold text-foreground">Sucos Detox</h3>
              <span className="text-xs text-muted-foreground">
                ({juices.length} sabores)
              </span>
            </div>

            <div className="space-y-3">
              {juices.map((juice) => (
                <div 
                  key={juice.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-xl">{juice.emoji}</span>
                  <div>
                    <p className="font-medium text-foreground text-sm">{juice.name}</p>
                    {juice.ingredients && (
                      <p className="text-xs text-muted-foreground">{juice.ingredients}</p>
                    )}
                    {juice.benefit && (
                      <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {juice.benefit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Soups */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-card rounded-xl p-5 border"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🍲</span>
              <h3 className="font-semibold text-foreground">Sopas Funcionais</h3>
              <span className="text-xs text-muted-foreground">
                ({soups.length} sabores)
              </span>
            </div>

            <div className="space-y-3">
              {soups.map((soup) => (
                <div 
                  key={soup.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-xl">{soup.emoji}</span>
                  <div>
                    <p className="font-medium text-foreground text-sm">{soup.name}</p>
                    {soup.ingredients && (
                      <p className="text-xs text-muted-foreground">{soup.ingredients}</p>
                    )}
                    {soup.benefit && (
                      <span className="inline-block mt-1 text-xs bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-full">
                        {soup.benefit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DetoxFlavorMenu;
