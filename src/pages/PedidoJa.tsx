import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, BarChart3, ShieldCheck, Smartphone, Store, Utensils, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Store,
    title: "Sua marca, seu domínio",
    description: "Cardápio e painel 100% personalizados com a identidade do seu restaurante.",
  },
  {
    icon: Smartphone,
    title: "Pedidos pelo celular",
    description: "Checkout otimizado para mobile com Pix integrado e notificações automáticas.",
  },
  {
    icon: BarChart3,
    title: "Painel completo",
    description: "Dashboard com vendas, estoque, clientes recorrentes e campanhas de recompra.",
  },
  {
    icon: Zap,
    title: "WhatsApp integrado",
    description: "Confirmação de pedido, lembrete de pagamento e recuperação de carrinho automáticos.",
  },
  {
    icon: ShieldCheck,
    title: "Cashback & Fidelidade",
    description: "Sistema de níveis de fidelidade com cashback automático para seus clientes.",
  },
  {
    icon: Utensils,
    title: "Gestão de cardápio",
    description: "Categorias, sabores, acompanhamentos e controle de estoque em tempo real.",
  },
];

const PedidoJa = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>PedidoJá — Plataforma para restaurantes saudáveis</title>
        <meta name="description" content="Sistema completo de gestão e vendas online para restaurantes de alimentação saudável. Cardápio digital, Pix, WhatsApp e muito mais." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Header */}
        <header className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-sm">
                PJ
              </div>
              <span className="font-semibold text-lg tracking-tight">PedidoJá</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              onClick={() => navigate("/admin")}
            >
              Entrar
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
            Plataforma para restaurantes saudáveis
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Venda suas marmitas{" "}
            <span className="text-emerald-400">online</span> com sistema próprio
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Cardápio digital, checkout com Pix, WhatsApp automático, painel de gestão completo e
            tudo com a <strong className="text-white">sua marca</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8 h-12"
              onClick={() => navigate("/admin")}
            >
              Acessar painel <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Tudo que seu restaurante precisa
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/[0.08] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Pronto para começar?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Acesse o painel administrativo do seu restaurante e comece a receber pedidos hoje mesmo.
            </p>
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8 h-12"
              onClick={() => navigate("/admin")}
            >
              Entrar no painel <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8">
          <p className="text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} PedidoJá — Plataforma de gestão de restaurantes
          </p>
        </footer>
      </div>
    </>
  );
};

export default PedidoJa;
