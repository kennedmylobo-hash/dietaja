
# Adicionar CTA "Monte Seu Cardapio" no Hero

## Objetivo

Adicionar um botao chamativo na secao Hero da landing page principal convidando o cliente a montar seu cardapio personalizado com a IA. O botao levara para a pagina `/monte-seu-cardapio`.

## O que sera feito

### Botao CTA no HeroSection

Adicionar um botao logo abaixo dos badges de social proof (estrelas e satisfacao), antes do fechamento da secao. O botao tera:

- Texto: "Monte suas marmitas do seu jeito"
- Subtexto abaixo: "Conte o que voce gosta e montamos pra voce"
- Icone de microfone ou sparkles para indicar IA
- Estilo `cta` (ja existe no projeto) com visual que se destaque sobre o fundo escuro do hero
- Link para `/monte-seu-cardapio` usando `react-router-dom`

### Layout

```text
[Hero existente - titulo, subtitulo, badges, social proof]

  ┌─────────────────────────────────────────────┐
  │  ✨ Monte suas marmitas do seu jeito        │
  │  Conte o que voce gosta e montamos pra voce │
  └─────────────────────────────────────────────┘
```

## Detalhes tecnicos

### Arquivo: `src/components/HeroSection.tsx`

- Importar `Link` de `react-router-dom` e `Sparkles` de `lucide-react`
- Adicionar o botao apos a div de social proof (linha ~105), dentro do `max-w-2xl`:

```text
<Link to="/monte-seu-cardapio" className="block animate-fade-in">
  <Button variant="cta" size="lg" className="...">
    <Sparkles className="w-5 h-5" />
    Monte suas marmitas do seu jeito
  </Button>
  <p className="text-sm text-white/70 mt-2">
    Conte o que voce gosta e montamos pra voce
  </p>
</Link>
```

- Importar `Button` de `@/components/ui/button`

### Arquivo afetado

Apenas `src/components/HeroSection.tsx`
