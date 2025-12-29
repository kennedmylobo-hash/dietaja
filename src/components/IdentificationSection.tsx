import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const IdentificationSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 md:py-28 bg-card">
      <div className="container px-6">
        <motion.div 
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xl md:text-2xl text-foreground leading-relaxed">
            Você não come mal porque quer.
            <br />
            <span className="text-muted-foreground">
              Você come mal porque carrega muita coisa nas costas.
            </span>
          </p>
          
          <div className="w-16 h-1 bg-primary/30 mx-auto my-8 rounded-full" />
          
          <p className="text-lg text-primary font-medium">
            Aqui, a alimentação deixa de ser mais uma preocupação.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default IdentificationSection;
