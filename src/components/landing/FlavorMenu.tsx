import { motion } from "framer-motion";
import { Beef, Drumstick, Utensils, Sparkles } from "lucide-react";

interface FlavorCategory {
  id: string;
  name: string;
  flavors: string[];
}

interface FlavorMenuProps {
  title: string;
  subtitle?: string;
  categories: FlavorCategory[];
}

const categoryIcons: Record<string, { icon: any; color: string; bg: string }> = {
  carnes: { icon: Beef, color: "text-red-600", bg: "bg-red-100" },
  frangos: { icon: Drumstick, color: "text-amber-600", bg: "bg-amber-100" },
  massas: { icon: Utensils, color: "text-orange-600", bg: "bg-orange-100" },
  especiais: { icon: Sparkles, color: "text-purple-600", bg: "bg-purple-100" },
};

const FlavorMenu = ({ title, subtitle, categories }: FlavorMenuProps) => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {categories.map((category, catIndex) => {
            const iconData = categoryIcons[category.id] || { icon: Sparkles, color: "text-primary", bg: "bg-primary/10" };
            const Icon = iconData.icon;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: catIndex * 0.1 }}
                className="bg-card rounded-xl p-5 border"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${iconData.bg}`}>
                    <Icon className={`w-5 h-5 ${iconData.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">{category.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({category.flavors.length})
                  </span>
                </div>

                <ul className="space-y-2">
                  {category.flavors.map((flavor, index) => (
                    <li 
                      key={index}
                      className="text-sm text-muted-foreground pl-3 border-l-2 border-muted"
                    >
                      {flavor}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FlavorMenu;
