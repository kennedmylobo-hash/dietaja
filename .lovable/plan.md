
# Limpeza de Referências "Dieta Já" + Onboarding Inteligente do Cliente

## Parte 1: Remover referências hardcoded do "Dieta Já"

Ainda existem referências diretas ao "Dieta Já", "Vitória da Conquista" e "dietajavca.com.br" espalhadas pelo projeto. Vou substituí-las por valores dinâmicos do tenant ou por fallbacks genéricos da plataforma ("PedidoJá").

### Arquivos a alterar:

| Arquivo | O que tem hardcoded | Solução |
|---|---|---|
| `index.html` | Title, meta tags, OG, Pixel, canonical com "Dieta Já" e "dietajavca" | Trocar por valores genéricos da plataforma ("PedidoJá - Seu Restaurante Online"). O Helmet já sobrescreve dinamicamente por tenant no runtime |
| `public/404.html` | Title "Dieta Já" | Trocar por "Redirecionando..." (genérico) |
| `src/config/site.ts` | Nome, cidade, WhatsApp, domínio, SEO tudo do Dieta Já | Trocar por valores genéricos da plataforma. Este arquivo é só fallback — o tenant real vem do banco |
| `src/components/admin/AdminSidebar.tsx` | Fallback "Dieta Já" | Trocar por "Meu Restaurante" |
| `src/lib/print-utils.ts` | Default `'DIETA JÁ'` nos parâmetros | Trocar por `'MEU RESTAURANTE'` |
| `src/lib/label-utils.ts` | Default `"DIETA JÁ"` nos parâmetros | Trocar por `"MEU RESTAURANTE"` |
| `src/lib/quiz-logic.ts` | Keys `dietaja_quiz_data` e `dietaja_incomplete_leads` | Trocar por `pedidoja_quiz_data` e `pedidoja_incomplete_leads` |
| `supabase/functions/_shared/tenant-branding.ts` | DEFAULT_BRANDING com dados do Dieta Já | Trocar por valores genéricos ("Meu Restaurante", sem WhatsApp fixo) |
| `supabase/functions/_shared/tenant-credentials.ts` | Fallback `pedidos@dietajavca.com.br` | Trocar por `noreply@pedidoja.com.br` (ou domínio da plataforma) |
| `supabase/functions/send-tenant-invite/index.ts` | `from: PedidoJá <pedidos@dietajavca.com.br>` e fallback slug | Usar branding dinâmico do tenant |
| `supabase/functions/send-order-confirmation/index.ts` | `from: ... <pedidos@dietajavca.com.br>` | Usar `fromEmail` do tenant-credentials |
| `supabase/functions/send-status-notification/index.ts` | Fallback URL `dietajavca.com.br` | Usar `getTenantBaseUrl(branding)` sempre |
| `supabase/functions/create-club-subscription/index.ts` | `Clube Dieta Já` na descrição | Usar `Clube ${branding.brand_name}` |
| `src/components/super-admin/SAOnboarding.tsx` | Texto "Clonar cardápio do Dieta Já" | Trocar por "Clonar cardápio modelo" |
| `src/hooks/useTenantId.ts` | Comentário "Dieta Já" | Remover referência no comentário |
| `src/components/admin/NotificationTester.tsx` | Template names com "dietaja" e PIX code fake com "DIETA JA" | Manter nomes de template (são identificadores reais do NotificaMe), limpar apenas textos de exibição |

**Nota**: Os nomes de templates WhatsApp (`pix_pendente_dietaja`, `compraa_confrimadaa`) são identificadores cadastrados no NotificaMe e NAO devem ser renomeados — são chaves de API, não texto de exibição.

---

## Parte 2: Onboarding Inteligente do Cliente (Minha Conta)

Quando o cliente faz login pela primeira vez e o perfil está incompleto (sem telefone, sem endereço), exibir um fluxo de boas-vindas guiado que pede as informações faltantes de forma amigável.

### Como vai funcionar:

1. Ao carregar `/minha-conta` com perfil logado, verificar se `phone` ou `preferred_address` estão vazios
2. Se estiverem, mostrar um modal/card de boas-vindas com um formulário passo a passo:
   - Passo 1: "Qual seu nome completo?" (pré-preenchido se já tiver)
   - Passo 2: "Qual seu WhatsApp?" (com máscara de telefone)
   - Passo 3: "Qual seu endereço de entrega?" (textarea)
3. Ao finalizar, salvar tudo no perfil via Supabase e fechar o modal
4. O cliente pode pular, mas o card reaparece até completar

### Detalhes técnicos:

- **Novo componente**: `src/components/minha-conta/ProfileOnboarding.tsx`
  - Recebe o `profile` como prop
  - Verifica campos vazios (`!profile.phone || !profile.preferred_address`)
  - Renderiza um Card com steps progressivos (indicador 1/3, 2/3, 3/3)
  - Salva via `supabase.from('profiles').update(...)` ao finalizar
  - Usa animações suaves com framer-motion (já instalado)

- **Alteração em `src/pages/MinhaConta.tsx`**:
  - Importar e renderizar `<ProfileOnboarding>` logo após o Profile Card quando perfil está incompleto
  - Passar callback `onComplete` para refresh do perfil após salvar

- **Multi-tenant**: O componente usa `useTenantConfig` para exibir o nome do restaurante na mensagem de boas-vindas (ex: "Complete seu cadastro no Pratinho Fitness")
