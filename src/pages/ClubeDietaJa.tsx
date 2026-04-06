import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { ShieldCheck } from "lucide-react";
import { useClubPlans, ClubPlan } from "@/hooks/useClubPlans";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";
import { useTenantId } from "@/hooks/useTenantId";
import ClubHero from "@/components/clube/ClubHero";
import ClubBenefits from "@/components/clube/ClubBenefits";
import ClubPlanCards from "@/components/clube/ClubPlanCards";
import ClubHowItWorks from "@/components/clube/ClubHowItWorks";
import ClubFAQ from "@/components/clube/ClubFAQ";
import ClubSubscriptionModal from "@/components/clube/ClubSubscriptionModal";

const ClubeDietaJa = () => {
  const { brand, urls } = useTenantConfig();
  const tenantId = useTenantId();
  const plansRef = useRef<HTMLDivElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<ClubPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    trackMetaEvent({
      eventName: 'PageView',
      eventId: generateMetaEventId('pageview'),
      tenantId,
      params: { page: '/clube' },
    });
  }, [tenantId]);

  const { data: plans = [] } = useClubPlans();

  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectPlan = (plan: ClubPlan) => {
    setLoadingId(plan.id);
    setSelectedPlan(plan);
    setTimeout(() => {
      setModalOpen(true);
      setLoadingId(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background">
       <Helmet>
         <title>Clube {brand.name} | Assinatura Mensal de Alimentação Saudável</title>
         <meta
           name="description"
           content={`Assine o Clube ${brand.name} e receba todo mês kits de alimentação saudável com sabores sortidos. Marmitas, sucos detox e sopas. Sem fidelidade.`}
         />
         <link rel="canonical" href={`${urls.canonical}/clubedietaja`} />
         <meta property="og:title" content={`Clube ${brand.name} - Assinatura Mensal`} />
         <meta
           property="og:description"
           content="Receba todo mês kits de alimentação saudável com sabores sortidos. Praticidade e economia."
         />
         <meta property="og:url" content={`${urls.canonical}/clubedietaja`} />
         <meta property="og:type" content="product" />
      </Helmet>

      <ClubHero onScrollToPlans={scrollToPlans} />
      <ClubBenefits />

      <div ref={plansRef}>
        <ClubPlanCards
          plans={plans}
          onSelect={handleSelectPlan}
          loadingId={loadingId}
        />
      </div>

      <ClubHowItWorks />
      <ClubFAQ />

      {/* Guarantee */}
      <section className="py-12 bg-amber-50/50 dark:bg-amber-950/10">
        <div className="container mx-auto px-4 text-center">
          <ShieldCheck className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Garantia de satisfação
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Se você não gostar, devolvemos seu dinheiro. Sem perguntas. Cancele quando quiser.
          </p>
        </div>
      </section>

      <ClubSubscriptionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        plan={selectedPlan}
      />
    </div>
  );
};

export default ClubeDietaJa;
