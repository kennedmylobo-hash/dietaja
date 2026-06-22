import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Users, MessageSquare } from "lucide-react";
import RecurringCustomers from "./RecurringCustomers";
import AIDietQuoter from "./AIDietQuoter";
import DietRequestsManager from "./DietRequestsManager";

const PersonalizedDietHub = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dieta Personalizada</h2>
        <p className="text-sm text-muted-foreground">
          Solicitações de clientes, orçamentos com IA e mensalistas
        </p>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            <MessageSquare className="w-4 h-4 mr-2" /> Solicitações
          </TabsTrigger>
          <TabsTrigger value="ai-quoter">
            <Sparkles className="w-4 h-4 mr-2" /> Orçamento IA
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="w-4 h-4 mr-2" /> Mensalistas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <DietRequestsManager />
        </TabsContent>
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
