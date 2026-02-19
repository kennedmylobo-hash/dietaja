
# Trocar domínio de pedidos.dietajavca.com.br para www.dietajavca.com.br

## Resumo
Remover todas as referencias ao subdominio `pedidos.dietajavca.com.br` e substituir por `www.dietajavca.com.br` em todo o projeto.

## Alteracoes

### 1. index.html
- Linha `og:url`: de `https://pedidos.dietajavca.com.br` para `https://www.dietajavca.com.br`
- Linha `og:image`: de `https://pedidos.dietajavca.com.br/og-image.jpg` para `https://www.dietajavca.com.br/og-image.jpg`

### 2. src/config/site.ts
- `domain`: de `pedidos.dietajavca.com.br` para `www.dietajavca.com.br`
- `canonical`: de `https://pedidos.dietajavca.com.br` para `https://www.dietajavca.com.br`
- `ogImage`: de `https://pedidos.dietajavca.com.br/og-image.jpg` para `https://www.dietajavca.com.br/og-image.jpg`

### 3. Banco de dados (tabela tenants)
- Atualizar o campo `domain` do tenant `dietaja` de `pedidos.dietajavca.com.br` para `www.dietajavca.com.br`

### 4. Dominio customizado no Lovable
- Apos as alteracoes, voce precisa conectar `www.dietajavca.com.br` como dominio customizado no Lovable (em Settings > Domains)
- Se o dominio `pedidos.dietajavca.com.br` ainda estiver conectado la, remova-o
- Configure o DNS do `www.dietajavca.com.br` apontando um registro A para `185.158.133.1`

## O que NAO sera alterado
- O arquivo `TenantContext.tsx` tem apenas um comentario mencionando `pedidos.dietajavca.com.br` como exemplo -- a logica de deteccao por hostname ja funciona de forma generica e nao precisa de mudanca

## Apos publicar
1. Publique o projeto no Lovable
2. No Facebook Sharing Debugger, faca "Scrape Again" com `https://www.dietajavca.com.br`
3. Atualize os links dos seus anuncios para usar `www.dietajavca.com.br`
