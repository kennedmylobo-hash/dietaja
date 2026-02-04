import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Obrigado from "./pages/Obrigado";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import PagamentoErro from "./pages/PagamentoErro";
import StatusPedido from "./pages/StatusPedido";
import Cardapio from "./pages/Cardapio";
import PixPayment from "./pages/PixPayment";
import MinhaConta from "./pages/MinhaConta";
import AdminResetPassword from "./pages/AdminResetPassword";
import Detox from "./pages/Detox";
import Fit from "./pages/Fit";
import Fitness from "./pages/Fitness";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/cardapio" element={<Cardapio />} />
              <Route path="/minha-conta" element={<MinhaConta />} />
              <Route path="/obrigado" element={<Obrigado />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/reset-password" element={<AdminResetPassword />} />
              <Route path="/pagamento/sucesso" element={<PagamentoSucesso />} />
              <Route path="/pagamento/erro" element={<PagamentoErro />} />
              <Route path="/pix/:paymentId" element={<PixPayment />} />
              <Route path="/pedido/:orderNumber" element={<StatusPedido />} />
              <Route path="/pedido" element={<StatusPedido />} />
              {/* Landing pages de categoria */}
              <Route path="/detox" element={<Detox />} />
              <Route path="/fit" element={<Fit />} />
              <Route path="/fitness" element={<Fitness />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
