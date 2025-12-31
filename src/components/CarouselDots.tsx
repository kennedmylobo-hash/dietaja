import type { CarouselApi } from "@/components/ui/carousel";

interface CarouselDotsProps {
  count: number;
  current: number;
  progress: number;
  api: CarouselApi | undefined;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  activeColor?: string;
}

export function CarouselDots({
  count,
  current,
  progress,
  api,
  onMouseEnter,
  onMouseLeave,
  activeColor = "bg-primary",
}: CarouselDotsProps) {
  return (
    <div
      className="flex justify-center gap-2 mt-4"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          className={`relative rounded-full transition-all duration-300 overflow-hidden ${
            index === current
              ? "w-8 h-2 bg-muted-foreground/20"
              : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
          }`}
          onClick={() => api?.scrollTo(index)}
          aria-label={`Ir para slide ${index + 1}`}
          aria-current={index === current ? "true" : undefined}
        >
          {index === current && (
            <div
              className={`absolute inset-0 ${activeColor} rounded-full origin-left`}
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
