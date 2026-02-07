
## Correção: Banners "Escolha uma opção abaixo" não aparecem

### Causa

Os itens de banner salvos no banco de dados (`tenant_landing_content` com `section_key = 'banners'`) estão incompletos. Cada item tem apenas `title`, `subtitle` e `description`, mas faltam os campos obrigatórios `id`, `icon`, `gradient` e `targetSection` que o componente precisa para renderizar os cards corretamente.

Dados atuais no banco:
```text
{ title: "🔥 Kit Emagrecimento", subtitle: "O mais vendido!", description: "5 marmitas balanceadas..." }
```

O componente espera:
```text
{ id, title, subtitle, description, icon, gradient, targetSection }
```

Sem `gradient`, os cards ficam sem cor de fundo. Sem `icon`, o ícone fallback (Droplets) aparece mas o card fica praticamente invisível.

### Solução

Tornar o componente `PromoBannersSection.tsx` resiliente a dados incompletos, aplicando valores padrão (defaults) para os campos ausentes.

### Mudanças

**Arquivo: `src/components/PromoBannersSection.tsx`**

Na seção onde `banners` é extraído do content (linha 178), adicionar um mapeamento que preenche campos faltantes com defaults sensatos:

```typescript
const rawBanners = content?.items ?? defaultBanners;
const banners = rawBanners.map((banner: any, index: number) => ({
  id: banner.id || `banner-${index}`,
  icon: banner.icon || ["Droplets", "UtensilsCrossed", "Salad"][index % 3],
  gradient: banner.gradient || [
    "from-primary/90 to-primary",
    "from-terracotta/90 to-terracotta", 
    "from-sage-dark/90 to-sage-dark"
  ][index % 3],
  targetSection: banner.targetSection || ["kits", "marmitas", "dieta-personalizada"][index % 3],
  title: banner.title,
  subtitle: banner.subtitle,
  description: banner.description,
}));
```

Isso garante que mesmo com dados parciais no banco, os cards sempre renderizam com ícones, cores e links de scroll corretos.
