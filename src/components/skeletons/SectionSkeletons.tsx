import { Skeleton } from "@/components/ui/skeleton";

// Skeleton for CustomDietSection
export const CustomDietSkeleton = () => (
  <section className="py-12 md:py-20 lg:py-28 bg-background">
    <div className="container px-4 md:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <Skeleton className="h-8 w-48 rounded-full" />
        </div>
        {/* Title */}
        <Skeleton className="h-8 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-6 w-2/3 mx-auto mb-8" />
        
        {/* Card */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="space-y-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </section>
);

// Skeleton for TestimonialsSection
export const TestimonialsSkeleton = () => (
  <section className="py-12 md:py-20 lg:py-28 bg-sage-light/30">
    <div className="container px-4 md:px-6">
      {/* Header */}
      <div className="text-center mb-8 md:mb-10">
        <Skeleton className="h-8 w-64 mx-auto mb-2" />
        <Skeleton className="h-5 w-48 mx-auto" />
      </div>
      
      {/* Cards grid */}
      <div className="max-w-4xl mx-auto grid gap-4 sm:gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-4 sm:p-6 border border-border">
            {/* Avatar */}
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            {/* Stars */}
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="w-4 h-4 rounded" />
              ))}
            </div>
            {/* Quote */}
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Skeleton for GuaranteeSection
export const GuaranteeSkeleton = () => (
  <section className="py-12 md:py-16 lg:py-20 bg-sage-light/20">
    <div className="container px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <Skeleton className="h-8 w-40 mx-auto mb-4 rounded-full" />
          <Skeleton className="h-7 w-56 mx-auto" />
        </div>
        
        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 sm:p-6 border border-border text-center">
              <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-4" />
              <Skeleton className="h-5 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-4/5 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// Skeleton for FAQSection
export const FAQSkeleton = () => (
  <section className="py-12 md:py-20 lg:py-28 bg-background">
    <div className="container px-4 md:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>
        
        {/* FAQ items */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA */}
        <div className="text-center mt-8">
          <Skeleton className="h-5 w-48 mx-auto mb-4" />
          <Skeleton className="h-12 w-56 mx-auto rounded-lg" />
        </div>
      </div>
    </div>
  </section>
);
