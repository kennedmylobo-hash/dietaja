import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, UtensilsCrossed, Salad, HelpCircle } from "lucide-react";
import { useActiveSection } from "@/hooks/useActiveSection";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "kits", label: "Kits Detox", icon: Droplets },
  { id: "marmitas", label: "Marmitas", icon: UtensilsCrossed },
  { id: "dieta-personalizada", label: "Dieta", icon: Salad },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

const SideNavigation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const activeSection = useActiveSection({
    sectionIds: navItems.map((item) => item.id),
    offset: 120,
  });

  useEffect(() => {
    const handleScroll = () => {
      // Show menu after scrolling past 90vh (hero section)
      const heroHeight = window.innerHeight * 0.9;
      setIsVisible(window.scrollY > heroHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Mobile Navigation - horizontal bar at top */}
          <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-16 left-0 right-0 z-40 flex lg:hidden justify-around p-2 bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground active:scale-95"
                  )}
                  aria-label={item.label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </motion.nav>

          {/* Desktop Navigation - side menu */}
          <motion.nav
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-1 p-2 bg-card/90 backdrop-blur-md border border-border/50 rounded-r-2xl shadow-lg"
          >
            {navItems.map((item, index) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "group flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium whitespace-nowrap">
                    {item.label}
                  </span>

                  {/* Hover tooltip */}
                  <span
                    className={cn(
                      "absolute left-full ml-3 px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap",
                      "bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                      isActive && "hidden"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};

export default SideNavigation;
