import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

const Logo = () => {
  return (
    <motion.div 
      className="flex items-center gap-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Leaf className="w-5 h-5 text-primary" />
        </div>
      </div>
      <span className="text-xl font-bold text-foreground">
        Dieta<span className="text-primary">Já</span>
      </span>
    </motion.div>
  );
};

export default Logo;
