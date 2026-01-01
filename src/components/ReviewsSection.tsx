import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, BadgeCheck } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import testimonialMariana from "@/assets/testimonial-mariana.jpg";
import testimonialCarla from "@/assets/testimonial-carla.jpg";
import testimonialJuliana from "@/assets/testimonial-juliana.jpg";

// Cores para avatares com iniciais
const avatarColors = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
];

const reviews = [
  {
    name: "Mariana S.",
    photo: testimonialMariana,
    rating: 5,
    comment: "Entre trabalho, casa e rotina, eu sempre ficava por último. Ter a alimentação pronta foi um cuidado que eu estava devendo comigo mesma.",
    date: "há 3 dias",
    verified: true,
  },
  {
    name: "Carla R.",
    photo: testimonialCarla,
    rating: 5,
    comment: "Chegar cansada e saber que tem comida saudável pronta muda tudo. Perdi 4kg no primeiro mês sem passar fome!",
    date: "há 1 semana",
    verified: true,
  },
  {
    name: "Juliana M.",
    photo: testimonialJuliana,
    rating: 5,
    comment: "Antes eu pedia delivery todo dia. Agora como melhor, gasto menos e sobra energia pra academia. Recomendo demais!",
    date: "há 2 semanas",
    verified: true,
  },
  {
    name: "Fernanda L.",
    photo: null,
    rating: 5,
    comment: "A praticidade é incrível! Acordo e já sei que minha alimentação do dia está garantida. Melhor investimento que fiz.",
    date: "há 4 dias",
    verified: true,
  },
  {
    name: "Patrícia O.",
    photo: null,
    rating: 5,
    comment: "Comida caseira de verdade, com tempero gostoso. Minha família toda aprovou! Super recomendo.",
    date: "há 5 dias",
    verified: true,
  },
  {
    name: "Amanda C.",
    photo: null,
    rating: 5,
    comment: "Finalmente consegui manter a dieta! As marmitas são deliciosas e variadas. Não enjoa nunca.",
    date: "há 1 semana",
    verified: true,
  },
  {
    name: "Luciana B.",
    photo: null,
    rating: 5,
    comment: "Entrega sempre pontual e embalagem impecável. Qualidade nota 10!",
    date: "há 2 dias",
    verified: true,
  },
  {
    name: "Beatriz M.",
    photo: null,
    rating: 5,
    comment: "Melhor custo-benefício da cidade. Comida saudável sem pesar no bolso.",
    date: "há 6 dias",
    verified: true,
  },
  {
    name: "Renata P.",
    photo: null,
    rating: 5,
    comment: "Eu era refém do delivery. Agora como saudável sem esforço!",
    date: "há 3 dias",
    verified: true,
  },
  {
    name: "Camila F.",
    photo: null,
    rating: 5,
    comment: "Nunca imaginei que comer bem seria tão fácil. Virou rotina.",
    date: "há 1 semana",
    verified: true,
  },
  {
    name: "Daniela S.",
    photo: null,
    rating: 5,
    comment: "Minha pele melhorou, durmo melhor. Tudo por causa da alimentação!",
    date: "há 5 dias",
    verified: true,
  },
  {
    name: "Priscila T.",
    photo: null,
    rating: 5,
    comment: "O sabor é incrível! Parece comida de vó, mas saudável.",
    date: "há 4 dias",
    verified: true,
  },
  {
    name: "Vanessa R.",
    photo: null,
    rating: 5,
    comment: "Perdi 6kg em 2 meses comendo de tudo, sem passar fome.",
    date: "há 2 semanas",
    verified: true,
  },
  {
    name: "Tatiane M.",
    photo: null,
    rating: 5,
    comment: "A variedade é ótima, não enjoa nunca. Super recomendo!",
    date: "há 1 semana",
    verified: true,
  },
  {
    name: "Gabriela N.",
    photo: null,
    rating: 4,
    comment: "Melhor custo-benefício da cidade para quem quer emagrecer.",
    date: "há 6 dias",
    verified: true,
  },
];

// Componente de avatar com foto ou iniciais coloridas
const ReviewAvatar = ({ name, photo, index }: { name: string; photo: string | null; index: number }) => {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
        loading="lazy"
        decoding="async"
        width={40}
        height={40}
      />
    );
  }

  // Avatar com iniciais
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const colorClass = avatarColors[index % avatarColors.length];

  return (
    <div
      className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white font-semibold text-sm border-2 border-white/20`}
    >
      {initials}
    </div>
  );
};

const averageRating = "4.9";
const totalReviews = 456;

// Distribuição de notas (simulada para 456 avaliações)
const ratingDistribution = [
  { stars: 5, count: 412, percentage: 90 },
  { stars: 4, count: 32, percentage: 7 },
  { stars: 3, count: 9, percentage: 2 },
  { stars: 2, count: 2, percentage: 0.4 },
  { stars: 1, count: 1, percentage: 0.2 },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

const RatingDistribution = ({ isInView }: { isInView: boolean }) => (
  <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
    {ratingDistribution.map((item, index) => (
      <div key={item.stars} className="flex items-center gap-2 text-sm">
        <span className="w-4 text-muted-foreground font-medium">{item.stars}</span>
        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-amber-400 rounded-full"
            initial={{ width: 0 }}
            animate={isInView ? { width: `${item.percentage}%` } : { width: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
          />
        </div>
        <span className="w-8 text-xs text-muted-foreground text-right">{item.count}</span>
      </div>
    ))}
  </div>
);

const ReviewsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 md:py-20 lg:py-28 bg-sage-light/30">
      <div className="container px-4 md:px-6">
        {/* Header com nota média e distribuição */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-8 md:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Nota média */}
          <div className="flex items-center gap-3">
            <span className="text-4xl md:text-5xl font-bold text-foreground">{averageRating}</span>
            <div className="flex flex-col items-start">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 md:w-6 md:h-6 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{totalReviews} avaliações</span>
            </div>
          </div>

          {/* Barra de distribuição */}
          <RatingDistribution isInView={isInView} />
        </motion.div>

        {/* Carrossel de avaliações */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-5xl mx-auto"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {reviews.map((review, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-soft border border-border h-full flex flex-col">
                    {/* Header do card */}
                    <div className="flex items-center gap-3 mb-3">
                      <ReviewAvatar name={review.name} photo={review.photo} index={index} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{review.name}</p>
                        <p className="text-xs text-muted-foreground">{review.date}</p>
                      </div>
                    </div>

                    {/* Rating e badge */}
                    <div className="flex items-center justify-between mb-3">
                      <StarRating rating={review.rating} />
                      {review.verified && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <BadgeCheck className="w-3 h-3" />
                          Compra verificada
                        </span>
                      )}
                    </div>

                    {/* Comentário */}
                    <p className="text-sm text-foreground leading-relaxed flex-1">
                      "{review.comment}"
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12" />
            <CarouselNext className="hidden md:flex -right-12" />
          </Carousel>
        </motion.div>
      </div>
    </section>
  );
};

export default ReviewsSection;
