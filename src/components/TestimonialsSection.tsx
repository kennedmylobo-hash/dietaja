import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Mariana S.",
    role: "Advogada, mãe de 2 filhos",
    quote: "Entre trabalho, casa e rotina, eu sempre ficava por último. Ter a alimentação pronta foi um cuidado que eu estava devendo comigo mesma.",
    initials: "MS",
  },
  {
    name: "Carla R.",
    role: "Empresária, 38 anos",
    quote: "Chegar cansada e saber que tem comida saudável pronta muda tudo. Perdi 4kg no primeiro mês sem passar fome!",
    initials: "CR",
  },
  {
    name: "Juliana M.",
    role: "Professora, mora sozinha",
    quote: "Antes eu pedia delivery todo dia. Agora como melhor, gasto menos e sobra energia pra academia. Recomendo demais!",
    initials: "JM",
  },
];

const TestimonialsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 md:py-28 bg-sage-light/30">
      <div className="container px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            O que nossas clientes dizem
          </h2>
          <p className="text-muted-foreground">Histórias reais de Vitória da Conquista</p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              className="bg-card rounded-2xl p-6 shadow-soft border border-border relative"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            >
              <Quote className="absolute top-4 right-4 w-6 h-6 text-primary/20" />
              
              {/* Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{testimonial.initials}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>

              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground leading-relaxed">
                "{testimonial.quote}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
