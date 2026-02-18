import { useState, useEffect } from "react";

interface UseActiveSectionOptions {
  sectionIds: string[];
  offset?: number;
}

export const useActiveSection = ({ sectionIds, offset = 100 }: UseActiveSectionOptions) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      let activeId: string | null = null;
      let closestDistance = -Infinity;

      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top - offset;
        if (top <= 0 && top > closestDistance) {
          closestDistance = top;
          activeId = id;
        }
      });

      setActiveSection(activeId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionIds, offset]);

  return activeSection;
};

export default useActiveSection;
