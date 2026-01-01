import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { 
  XCircle, 
  CheckCircle, 
  Clock, 
  Frown, 
  Smile, 
  Pizza, 
  Salad,
  BatteryLow,
  BatteryFull,
  CircleDollarSign,
  PiggyBank,
  ArrowRight
} from "lucide-react";

const beforeItems = [
  { icon: Clock, text: "Sem tempo pra cozinhar" },
  { icon: Pizza, text: "Delivery todo dia" },
  { icon: BatteryLow, text: "Cansada e sem energia" },
  { icon: CircleDollarSign, text: "Gastando demais com comida" },
  { icon: Frown, text: "Culpa por não cuidar de si" },
];

const afterItems = [
  { icon: Clock, text: "Refeições prontas esperando" },
  { icon: Salad, text: "Comida saudável e saborosa" },
  { icon: BatteryFull, text: "Energia pro dia todo" },
  { icon: PiggyBank, text: "Economia no fim do mês" },
  { icon: Smile, text: "Orgulho do autocuidado" },
];

const BeforeAfterSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 md:py-16 lg:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
            Transformação Real
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Como muda a sua rotina
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Veja a diferença que ter alimentação saudável pronta faz no seu dia a dia
          </p>
        </motion.div>

        {/* Before/After Cards */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
          {/* Before Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-card border border-destructive/20 rounded-2xl p-4 sm:p-6 md:p-8 h-full">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Antes</h3>
                  <p className="text-sm text-muted-foreground">Sua rotina hoje</p>
                </div>
              </div>

              {/* Items */}
              <ul className="space-y-3 sm:space-y-4">
                {beforeItems.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                  >
                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-destructive/70 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-foreground/80">{item.text}</span>
                  </motion.li>
                ))}
              </ul>

              {/* Emoji */}
              <div className="mt-4 sm:mt-6 text-center">
                <span className="text-3xl sm:text-4xl">😓</span>
              </div>
            </div>
          </motion.div>

          {/* Arrow (mobile) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex md:hidden justify-center -my-2"
          >
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center rotate-90">
              <ArrowRight className="w-6 h-6 text-primary-foreground" />
            </div>
          </motion.div>

          {/* After Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative"
          >
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-4 sm:p-6 md:p-8 h-full shadow-lg shadow-primary/5">
              {/* Destaque badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 sm:px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  ✨ Com a Dieta Já
                </span>
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4 sm:mb-6 mt-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Depois</h3>
                  <p className="text-sm text-muted-foreground">Sua nova rotina</p>
                </div>
              </div>

              {/* Items */}
              <ul className="space-y-3 sm:space-y-4">
                {afterItems.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <span className="text-sm sm:text-base text-foreground font-medium">{item.text}</span>
                  </motion.li>
                ))}
              </ul>

              {/* Emoji */}
              <div className="mt-4 sm:mt-6 text-center">
                <span className="text-3xl sm:text-4xl">😊</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA hint */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-10 text-muted-foreground"
        >
          Pronta pra fazer essa mudança? 
          <span className="text-primary font-medium"> Role pra ver os kits</span> 👇
        </motion.p>
      </div>
    </section>
  );
};

export default BeforeAfterSection;
