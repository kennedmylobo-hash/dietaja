import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "./components/ErrorBoundary";
import { TenantProvider } from "./contexts/TenantContext";

import { lazy, Suspense, useEffect } from "react";
import MetaPixel from "./components/MetaPixel";
import GoogleAnalytics from "./components/GoogleAnalytics";
import Canonical from "./components/Canonical";
import ProtectedRoute from "./components/ProtectedRoute";
import { CartProvider } from "@/components/CartContext";

// Eager load critical pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Cardapio from "./pages/Cardapio";

// Lazy load less critical pages
const Obrigado = lazy(() => import("./pages/Obrigado"));
const Admin = lazy(() => import("./pages/Admin"));
const PagamentoSucesso = lazy(() => import("./pages/PagamentoSucesso"));
const PagamentoErro = lazy(() => import("./pages/PagamentoErro"));
const StatusPedido = lazy(() => import("./pages/StatusPedido"));
const PixPayment = lazy(() => import("./pages/PixPayment"));
const MinhaConta = lazy(() => import("./pages/MinhaConta"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const Detox = lazy(() => import("./pages/Detox"));
const Fit = lazy(() => import("./pages/Fit"));
const Fitness = lazy(() => import("./pages/Fitness"));
const Avaliar = lazy(() => import("./pages/Avaliar"));
const ClientFeedback = lazy(() => import("./pages/ClientFeedback"));
const ClubeDietaJa = lazy(() => import("./pages/ClubeDietaJa"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const MonteSeuCardapio = lazy(() => import("./pages/MonteSeuCardapio"));
const Licenca = lazy(() => import("./pages/Licenca"));
const KitMensal = lazy(() => import("./pages/KitMensal"));
const PrimeiroPedido = lazy(() => import("./pages/PrimeiroPedido"));
const TenantLandingPage = lazy(() => import("./pages/TenantLandingPage"));
const SiteVendas = lazy(() => import("./pages/SiteVendas"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const Campanha = lazy(() => import("./pages/Campanha"));

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Handle SPA redirect from 404.html fallback
const SpaRedirectHandler = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('spa-redirect');
    if (redirectPath) {
      sessionStorage.removeItem('spa-redirect');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);
  return null;
};

// v2.0 - Landing pages Fit, Fitness e Detox
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minuto — evita refetch imediato de dados estáveis (cardápio, planos)
      gcTime: 5 * 60_000, // 5 minutos de cache inativo
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            
            <BrowserRouter>
              <CartProvider>
                <MetaPixel />
                <GoogleAnalytics />
                <SpaRedirectHandler />
                <Canonical />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/cardapio" element={<Cardapio />} />
                    <Route path="/minha-conta" element={<ProtectedRoute allowedRoles={["admin", "super_admin", "customer"]}><MinhaConta /></ProtectedRoute>} />
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
                    <Route path="/avaliar/:orderToken" element={<Avaliar />} />
                    <Route path="/feedback/:token" element={<ClientFeedback />} />
                    <Route path="/clubedietaja" element={<ClubeDietaJa />} />
                    <Route path="/super-admin" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdmin /></ProtectedRoute>} />
                    <Route path="/monte-seu-cardapio" element={<MonteSeuCardapio />} />
                    <Route path="/licenca" element={<Licenca />} />
                    <Route path="/kit-mensal" element={<KitMensal />} />
                    <Route path="/primeiro-pedido" element={<PrimeiroPedido />} />
                    <Route path="/c/:slug" element={<TenantLandingPage />} />
                    <Route path="/site" element={<SiteVendas />} />
                    <Route path="/campanha" element={<Campanha />} />
                    <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </CartProvider>
            </BrowserRouter>
          </TooltipProvider>
        </TenantProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
