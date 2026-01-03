import { useState, useEffect } from "react";

interface UseActiveSectionOptions {
  sectionIds: string[];
  offset?: number;
}

export const useActiveSection = ({ sectionIds, offset = 100 }: UseActiveSectionOptions) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibleSections = new Map<string, number>();

    sectionIds.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              visibleSections.set(sectionId, entry.intersectionRatio);
            } else {
              visibleSections.delete(sectionId);
            }

            // Find the section with highest visibility
            let maxRatio = 0;
            let mostVisible: string | null = null;
            
            visibleSections.forEach((ratio, id) => {
              if (ratio > maxRatio) {
                maxRatio = ratio;
                mostVisible = id;
              }
            });

            setActiveSection(mostVisible);
          });
        },
        {
          rootMargin: `-${offset}px 0px -50% 0px`,
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [sectionIds, offset]);

  return activeSection;
};

export default useActiveSection;
