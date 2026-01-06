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
              <Route path="/obrigado" element={<Obrigado />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/pagamento/sucesso" element={<PagamentoSucesso />} />
              <Route path="/pagamento/erro" element={<PagamentoErro />} />
              <Route path="/pedido/:orderNumber" element={<StatusPedido />} />
              <Route path="/pedido" element={<StatusPedido />} />
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
