import RecurringCustomers from "./RecurringCustomers";

const PersonalizedDietHub = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dieta Personalizada</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie clientes mensalistas, saldo de marmitas e feedbacks
        </p>
      </div>
      <RecurringCustomers />
    </div>
  );
};

export default PersonalizedDietHub;
