import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Quote, Star } from "lucide-react";
import { useLandingContent } from "@/hooks/useLandingContent";

const avatarColors = ["bg-rose-500", "bg-emerald-500", "bg-blue-500"];

const defaultTestimonials = [
  { name: "Mariana S.", role: "Advogada, mãe de 2 filhos", quote: "Entre trabalho, casa e rotina, eu sempre ficava por último. Ter a alimentação pronta foi um cuidado que eu estava devendo comigo mesma.", initials: "MS" },
  { name: "Rafael T.", role: "Engenheiro, home office", quote: "Trabalho de casa e acabava comendo qualquer coisa. Agora tenho disciplina sem esforço. Perdi 5kg em 6 semanas!", initials: "RT" },
  { name: "Juliana M.", role: "Professora, mora sozinha", quote: "Antes eu pedia delivery todo dia. Agora como melhor, gasto menos e sobra energia pra academia. Recomendo demais!", initials: "JM" },
];

const TestimonialsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { content, isVisible } = useLandingContent("testimonials");

  if (!isVisible) return null;

  const testimonials = content?.items ?? defaultTestimonials;

  return (
    <section ref={ref} className="py-12 md:py-20 lg:py-28 bg-sage-light/30">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-8 md:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
            O que nossos clientes dizem
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Histórias reais de Vitória da Conquista</p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid gap-4 sm:gap-6 md:grid-cols-3">
          {testimonials.map((testimonial: any, index: number) => (
            <motion.div
              key={testimonial.name}
              className="bg-card rounded-2xl p-4 sm:p-6 shadow-soft border border-border relative"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            >
              <Quote className="absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 text-primary/20" />
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white font-semibold text-sm border-2 border-white/20`}>
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed">"{testimonial.quote}"</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
