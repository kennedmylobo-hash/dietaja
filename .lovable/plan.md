

# Painel Admin: Editor de Landing Page por Tenant

## Objetivo

Permitir que cada restaurante (tenant) personalize completamente sua landing page pelo painel admin, editando textos, imagens, depoimentos e secoes -- sem precisar mexer em codigo.

---

## Arquitetura

Criar uma tabela `tenant_landing_content` que armazena blocos de conteudo editavel por secao, e um novo modulo "Minha Loja" no admin para gerenciar tudo.

---

## Parte 1 -- Tabela de conteudo da landing page

Criar a tabela `tenant_landing_content` com a seguinte estrutura:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| section_key | text | Identificador da secao (ex: `hero`, `testimonials`, `banners`) |
| content | jsonb | Conteudo editavel da secao |
| is_visible | boolean | Se a secao esta ativa |
| sort_order | integer | Ordem de exibicao |
| created_at / updated_at | timestamptz | |

Unique constraint em `(tenant_id, section_key)`.

### Secoes editaveis (section_key)

1. **`hero`** -- Titulo principal, subtitulo, badges (ex: "Retirada gratis"), social proof ("200+ kits"), video/imagem de fundo (URL)
2. **`identification`** -- Texto emocional principal e subtexto
3. **`testimonials`** -- Array de depoimentos (nome, cargo, frase, iniciais)
4. **`solution`** -- Texto principal e lista de features
5. **`before_after`** -- Items do "antes" e "depois"
6. **`product_gallery`** -- Titulo, badges, video/imagem URL
7. **`banners`** -- Array de banners promocionais (titulo, subtitulo, descricao)
8. **`guarantee`** -- Array de garantias (titulo, descricao, icone)
9. **`faq`** -- Array de perguntas e respostas
10. **`custom_diet`** -- Textos da secao dieta personalizada

### RLS

- SELECT publico (qualquer um pode ler para renderizar a landing)
- INSERT/UPDATE/DELETE apenas admin do tenant

---

## Parte 2 -- Seed do conteudo padrao

Ao criar um novo tenant (edge function `create-tenant`), inserir automaticamente os registros de `tenant_landing_content` com o conteudo padrao (mesmo conteudo hardcoded atual do Dieta Ja). Isso permite que o novo restaurante tenha uma landing funcional imediatamente e edite conforme desejar.

---

## Parte 3 -- Modulo Admin: "Minha Loja"

Adicionar uma nova secao no `AdminSidebar` chamada **"Minha Loja"** (icone Store/Palette) com sub-secoes:

### 3.1 -- Dados do Restaurante
Editor para campos da tabela `tenants`:
- Nome da marca, slogan
- Logo (upload para Storage)
- Cor primaria (color picker)
- Cidade, estado, bairro de retirada
- WhatsApp, taxa de entrega
- Facebook Pixel ID, Google Analytics ID

### 3.2 -- Editor de Secoes da Landing
Interface visual para cada secao editavel:

- **Hero**: Campos para titulo, subtitulo, badges (adicionar/remover), texto de social proof, upload de video/imagem de fundo
- **Depoimentos**: Lista editavel (adicionar, editar, remover depoimentos) com campos nome, cargo, frase
- **Banners Promo**: Lista editavel de banners com titulo, subtitulo, descricao
- **FAQ**: Lista editavel de perguntas e respostas
- **Secoes On/Off**: Toggle para mostrar/esconder cada secao (ex: desativar "Antes/Depois" se nao aplicavel)

Cada secao tera um formulario com "Salvar" que faz upsert na `tenant_landing_content`.

### 3.3 -- Imagens e Midias
- Upload de logo, hero background, imagens de galeria
- Utilizara Lovable Cloud Storage (bucket `tenant-assets`)
- URLs salvas no `content` JSONB ou na tabela `tenants`

---

## Parte 4 -- Frontend: Renderizar conteudo dinamico

Criar um hook `useLandingContent(sectionKey)` que busca o conteudo de `tenant_landing_content` para o tenant atual. Os componentes da landing serao atualizados para:

1. Tentar carregar conteudo do banco (via hook)
2. Usar fallback hardcoded se nao houver registro (compatibilidade retroativa com Dieta Ja)

Exemplo de fluxo:

```text
HeroSection
  |
  +-- useLandingContent('hero')
  |     |
  |     +-- Dados do banco? --> Renderiza dinamico
  |     +-- Sem dados? -------> Usa conteudo hardcoded atual
```

### Componentes a atualizar:
- `HeroSection.tsx` -- titulo, subtitulo, badges, social proof, video URL
- `IdentificationSection.tsx` -- textos emocionais
- `TestimonialsSection.tsx` -- lista de depoimentos
- `SolutionSection.tsx` -- textos e features
- `BeforeAfterSection.tsx` -- items antes/depois
- `ProductGallerySection.tsx` -- titulo, badges, video
- `PromoBannersSection.tsx` -- banners
- `GuaranteeSection.tsx` -- garantias
- `FAQSection.tsx` -- perguntas
- `ValueSection.tsx` -- beneficios

---

## Parte 5 -- Storage para imagens

Criar um bucket `tenant-assets` no Lovable Cloud Storage com:
- Politica publica de leitura
- Upload restrito ao admin do tenant
- Organizacao: `tenant-assets/{tenant_id}/hero.jpg`, `tenant-assets/{tenant_id}/logo.png`, etc.

---

## Secao Tecnica -- Resumo de Mudancas

### Migracao SQL
- Criar tabela `tenant_landing_content` com RLS
- Criar bucket de storage `tenant-assets`
- Seed do conteudo padrao para tenant Dieta Ja

### Novos componentes admin (~3 arquivos)
- `src/components/admin/LandingEditor.tsx` -- Editor principal com abas por secao
- `src/components/admin/TenantSettingsEditor.tsx` -- Editor de dados do restaurante (tabela tenants)
- `src/components/admin/SectionEditor.tsx` -- Componente reutilizavel para editar arrays (depoimentos, FAQ, banners)

### Hook novo
- `src/hooks/useLandingContent.ts` -- Busca conteudo da landing por section_key e tenant_id

### Arquivos editados
- `AdminSidebar.tsx` -- Adicionar grupo "Minha Loja"
- `Admin.tsx` -- Renderizar novos componentes
- ~10 componentes da landing -- Usar hook `useLandingContent` com fallback

### Edge function
- `create-tenant` -- Adicionar seed de `tenant_landing_content` no onboarding

### Impacto
- Zero breaking change: Dieta Ja continua funcionando com fallback hardcoded
- Novos tenants recebem conteudo editavel desde o primeiro dia
- Admins podem personalizar tudo sem suporte tecnico

