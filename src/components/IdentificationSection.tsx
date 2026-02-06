import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { useLandingContent } from "@/hooks/useLandingContent";

const IdentificationSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { content, isVisible } = useLandingContent("identification");

  if (!isVisible) return null;

  // Fallback hardcoded
  const mainText = content?.title ?? "Você não come mal porque quer.";
  const subText = content?.items?.[0] ?? "Você come mal porque carrega muita coisa nas costas.";
  const ctaText = content?.items?.[1] ?? "Aqui, a alimentação deixa de ser mais uma preocupação.";

  return (
    <section ref={ref} className="py-12 md:py-20 lg:py-28 bg-card">
      <div className="container px-4 md:px-6">
        <motion.div 
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-lg sm:text-xl md:text-2xl text-foreground leading-relaxed">
            {mainText}
            <br />
            <span className="text-muted-foreground">{subText}</span>
          </p>
          
          <div className="w-16 h-1 bg-primary/30 mx-auto my-8 rounded-full" />
          
          <p className="text-base sm:text-lg text-primary font-medium">{ctaText}</p>
        </motion.div>
      </div>
    </section>
  );
};

export default IdentificationSection;
