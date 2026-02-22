import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Dumbbell, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import marmita1 from "@/assets/marmita-1.png";
import marmita2 from "@/assets/marmita-2.png";
import produtosDetox from "@/assets/produtos-detox.jpg";

const lines = [
  {
    slug: "fit",
    title: "Linha FIT",
    subtitle: "Emagrecimento",
    description: "Marmitas de 300g com baixa caloria, perfeitas para quem quer secar sem passar fome.",
    price: "R$ 22,90",
    priceLabel: "a partir de",
    icon: Leaf,
    image: marmita1,
    color: "from-emerald-500/20 to-emerald-600/5",
    borderColor: "border-emerald-500/30",
    iconColor: "text-emerald-600",
    tag: "🔥 Mais vendida",
  },
  {
    slug: "fitness",
    title: "Linha FITNESS",
    subtitle: "Hipertrofia",
    description: "Marmitas de 450g com alto teor proteico para quem treina pesado e quer resultado.",
    price: "R$ 27,90",
    priceLabel: "a partir de",
    icon: Dumbbell,
    image: marmita2,
    color: "from-amber-500/20 to-amber-600/5",
    borderColor: "border-amber-500/30",
    iconColor: "text-amber-600",
    tag: "💪 +Proteína",
  },
  {
    slug: "detox",
    title: "Kit DETOX",
    subtitle: "Sucos & Sopas",
    description: "Programa completo com sucos funcionais e sopas nutritivas para desintoxicar o corpo.",
    price: "R$ 89,90",
    priceLabel: "a partir de",
    icon: Droplets,
    image: produtosDetox,
    color: "from-primary/20 to-primary/5",
    borderColor: "border-primary/30",
    iconColor: "text-primary",
    tag: "🥤 Detox completo",
  },
];

const Cardapio = () => {
  const navigate = useNavigate();
  const { brand } = useTenantConfig();

  return (
    <>
      <Helmet>
        <title>Cardápio Completo | {brand.name}</title>
        <meta
          name="description"
          content="Escolha sua linha de alimentação saudável: Fit para emagrecimento, Fitness para hipertrofia ou Kit Detox para desintoxicação."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container px-6 py-4 flex items-center justify-between">
            <Logo />
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              ← Voltar
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="py-12 md:py-20">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-2xl mx-auto text-center mb-10 md:mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                Escolha sua linha de{" "}
                <span className="text-primary">alimentação saudável</span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Cada linha foi pensada para um objetivo diferente. Qual é o seu?
              </p>
            </motion.div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {lines.map((line, i) => {
                const Icon = line.icon;
                return (
                  <motion.button
                    key={line.slug}
                    className={`group relative flex flex-col rounded-2xl border ${line.borderColor} bg-gradient-to-b ${line.color} p-6 text-left transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    onClick={() => navigate(`/${line.slug}`)}
                  >
                    {/* Tag */}
                    <span className="absolute top-4 right-4 text-xs font-medium bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border/50">
                      {line.tag}
                    </span>

                    {/* Image */}
                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-5 bg-muted/30">
                      <img
                        src={line.image}
                        alt={line.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${line.iconColor}`} />
                      <h2 className="text-xl font-bold text-foreground">{line.title}</h2>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{line.subtitle}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                      {line.description}
                    </p>

                    {/* Price + CTA */}
                    <div className="flex items-end justify-between mt-auto">
                      <div>
                        <span className="text-xs text-muted-foreground">{line.priceLabel}</span>
                        <p className="text-2xl font-bold text-foreground">{line.price}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                        Ver opções <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border">
          <div className="container px-6 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {brand.name}. Todas as refeições são congeladas e prontas em 3 minutos.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Cardapio;
