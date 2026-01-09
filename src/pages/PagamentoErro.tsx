import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, Home, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Helmet } from "react-helmet-async";
import { siteConfig, getWhatsAppLink } from "@/config/site";

const PagamentoErro = () => {
  return (
    <>
      <Helmet>
        <title>Erro no Pagamento | {siteConfig.brand.name}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-destructive/5 to-background flex flex-col">
        {/* Header */}
        <header className="py-4 px-4">
          <div className="container">
            <Link to="/">
              <Logo />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            className="max-w-md w-full bg-card rounded-2xl p-8 shadow-soft border border-border text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <XCircle className="w-20 h-20 text-destructive mx-auto mb-6" />
            </motion.div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Ops! Algo deu errado
            </h1>

            <p className="text-muted-foreground mb-6">
              Não foi possível processar seu pagamento. Não se preocupe, você não foi cobrado.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-foreground mb-2">Possíveis causas:</p>
              <ul className="text-sm text-muted-foreground text-left space-y-1">
                <li>• Saldo insuficiente na conta</li>
                <li>• Problema temporário com o PIX</li>
                <li>• Tempo limite do pagamento expirado</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild variant="cta" size="lg" className="w-full">
                <Link to="/#checkout">
                  <RefreshCw className="w-5 h-5" />
                  Tentar novamente
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="w-full">
                <a
                  href={getWhatsAppLink("Olá! Tive um problema com meu pagamento e preciso de ajuda.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-5 h-5" />
                  Ajuda via WhatsApp
                </a>
              </Button>

              <Button asChild variant="ghost" size="lg" className="w-full">
                <Link to="/">
                  <Home className="w-5 h-5" />
                  Voltar ao início
                </Link>
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default PagamentoErro;
