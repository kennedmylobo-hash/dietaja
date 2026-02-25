import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, HeartHandshake, Package } from "lucide-react";
import RecurringCustomers from "./RecurringCustomers";
import ClientFeedbackManager from "./ClientFeedbackManager";

const PersonalizedDietHub = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dieta Personalizada</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie clientes mensalistas, saldo de marmitas e feedbacks semanais
        </p>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          <RecurringCustomers />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <ClientFeedbackManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonalizedDietHub;
