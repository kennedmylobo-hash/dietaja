import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Users } from "lucide-react";
import RecurringCustomers from "./RecurringCustomers";
import AIDietQuoter from "./AIDietQuoter";

const PersonalizedDietHub = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dieta Personalizada</h2>
        <p className="text-sm text-muted-foreground">
          Gere orçamentos com IA e gerencie clientes mensalistas
        </p>
      </div>

      <Tabs defaultValue="ai-quoter" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai-quoter">
            <Sparkles className="w-4 h-4 mr-2" /> Orçamento IA
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="w-4 h-4 mr-2" /> Mensalistas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ai-quoter">
          <AIDietQuoter />
        </TabsContent>
        <TabsContent value="customers">
          <RecurringCustomers />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonalizedDietHub;
