import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PoliticaPrivacidade = () => {
  return (
    <>
      <Helmet>
        <title>Política de Privacidade | Dieta Já</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container px-6 py-4">
            <Link to="/">
              <Button variant="ghost" size="sm">← Voltar ao site</Button>
            </Link>
          </div>
        </header>

        <main className="container px-6 py-12 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            Política de Privacidade
          </h1>

          <div className="prose prose-gray max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                1. Informações que coletamos
              </h2>
              <p>
                Coletamos informações que você nos fornece diretamente ao fazer um pedido:
                nome, e-mail, telefone/WhatsApp, endereço de entrega e CPF (quando
                aplicável para pagamento PIX).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                2. Como usamos suas informações
              </h2>
              <p>
                Utilizamos seus dados exclusivamente para:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Processar e entregar seu pedido</li>
                <li>Enviar confirmações e atualizações por WhatsApp</li>
                <li>Processar pagamentos via Asaas</li>
                <li>Melhorar nossa comunicação e experiência</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                3. Compartilhamento de dados
              </h2>
              <p>
                Seus dados são compartilhados apenas com prestadores de serviço
                necessários para a operação: Asaas (pagamentos), WhatsApp Business
                (comunicação) e Supabase (hospedagem). Não vendemos ou alugamos
                seus dados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                4. Cookies e tecnologias similares
              </h2>
              <p>
                Utilizamos cookies essenciais para funcionamento do site, cookies
                de analytics (Meta Pixel) para entender como você navega, e cookies
                de preferência para lembrar suas escolhas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                5. Seus direitos (LGPD)
              </h2>
              <p>
                Você pode solicitar a qualquer momento:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Acesso aos seus dados pessoais</li>
                <li>Correção de dados incorretos</li>
                <li>Exclusão dos seus dados</li>
                <li>Revogação do consentimento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                6. Contato
              </h2>
              <p>
                Para exercer seus direitos ou tirar dúvidas, entre em contato pelo
                WhatsApp disponível no site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                7. Atualizações
              </h2>
              <p>
                Podemos atualizar esta política periodicamente. A data da última
                atualização é indicada no rodapé do site.
              </p>
            </section>
          </div>
        </main>

        <footer className="py-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Dieta Já — Todos os direitos reservados
        </footer>
      </div>
    </>
  );
};

export default PoliticaPrivacidade;
