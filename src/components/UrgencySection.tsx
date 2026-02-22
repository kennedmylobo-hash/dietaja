import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Clock, Truck, CalendarCheck } from "lucide-react";
import { useTenantConfig } from "@/hooks/useTenantConfig";

const UrgencySection = () => {
  const { location } = useTenantConfig();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Calculate next production window
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

  let deadlineText: string;
  let productionText: string;

  // Simple logic: if before 18h on weekdays, production is tomorrow
  // After 18h or weekends, next business day
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isBeforeDeadline = hour < 18;

  if (isWeekday && isBeforeDeadline) {
    deadlineText = "hoje até às 18h";
    productionText = "produzidos amanhã";
  } else if (dayOfWeek === 5 && !isBeforeDeadline) {
    deadlineText = "até segunda às 18h";
    productionText = "produzidos na terça";
  } else if (dayOfWeek === 6) {
    deadlineText = "até segunda às 18h";
    productionText = "produzidos na terça";
  } else if (dayOfWeek === 0) {
    deadlineText = "até segunda às 18h";
    productionText = "produzidos na terça";
  } else {
    deadlineText = "até amanhã às 18h";
    productionText = "produzidos no dia seguinte";
  }

  return (
    <section ref={ref} className="py-10 md:py-14 bg-card">
      <div className="container px-4 md:px-6">
        <motion.div
          className="max-w-xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CalendarCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  Pedidos confirmados {deadlineText}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  serão {productionText} com ingredientes frescos 🌿
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary/70" />
                <span>Entrega em até 72h úteis</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary/70" />
                <span>Retirada grátis no {location.pickupNeighborhood}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default UrgencySection;
