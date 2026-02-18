import { useRef, useEffect } from "react";
import { Star, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import produtosVideo from "@/assets/produtos-detox-video.mp4";
import produtosPoster from "@/assets/produtos-detox.jpg";
import { useLandingContent } from "@/hooks/useLandingContent";
import { useTenantConfig } from "@/hooks/useTenantConfig";

const HeroSection = () => {
  const { location } = useTenantConfig();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { content, isVisible } = useLandingContent("hero");

  // Only play video when visible in viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  if (!isVisible) return null;

  // Fallback to hardcoded content
  const title = content?.title ?? "Coma melhor mesmo sem tempo —";
  const titleHighlight = content?.title_highlight ?? "e sinta seu corpo responder.";
  const subtitle = content?.subtitle ?? "Alimentação saudável pronta para quem tem rotina corrida em";
  const badges = content?.badges ?? [
    { emoji: "📍", text: "Retirada grátis" },
    { emoji: "⚡", text: "Pronto em 3 min" },
    { emoji: "✅", text: "Garantia total" },
  ];
  const socialProofRating = content?.social_proof_rating ?? "+200 kits entregues";
  const socialProofSatisfaction = content?.social_proof_satisfaction ?? "98% de satisfação";

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src={produtosVideo}
          poster={produtosPoster}
          loop
          muted
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 15%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
      </div>

      <div className="relative z-10 container px-4 md:px-6 py-12 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-3 animate-fade-in">
            <span className="text-xs sm:text-sm font-medium text-white">
              📍 Entregamos apenas em {location.city} - {location.state}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mt-6 mb-6 animate-fade-in">
            {title}{" "}
            <span className="text-primary">{titleHighlight}</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 leading-relaxed animate-fade-in">
            {subtitle}{" "}
            <strong className="text-white">{location.city}</strong>.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-6 mb-6 animate-fade-in">
            {badges.map((badge: { emoji: string; text: string }, i: number) => (
              <div key={i} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/90 bg-white/10 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-full">
                <span>{badge.emoji}</span>
                <span>{badge.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm mb-6 animate-fade-in">
            <div className="flex items-center gap-2 text-white/80">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="font-medium">{socialProofRating}</span>
            </div>
            
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/40" />
            
            <div className="flex items-center gap-2 text-white/80">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="font-medium">{socialProofSatisfaction}</span>
          </div>

          <Link to="/monte-seu-cardapio" className="block animate-fade-in mt-2">
            <Button variant="cta" size="lg" className="w-full sm:w-auto">
              <Sparkles className="w-5 h-5" />
              Monte suas marmitas do seu jeito
            </Button>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Conte o que você gosta e montamos pra você
            </p>
          </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
