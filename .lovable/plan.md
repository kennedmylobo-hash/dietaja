

# Corrigir erro nas paginas /fit, /fitness e /detox no dominio publicado

## Diagnostico

Identifiquei **2 problemas** que estao causando o erro "Ops! Algo deu errado" para os clientes:

### Problema 1: Dominio no banco de dados nao foi atualizado
O campo `domain` na tabela `tenants` ainda esta como `pedidos.dietajavca.com.br` em vez de `www.dietajavca.com.br`. Isso foi planejado na migracao anterior mas **nao foi executado**.

Quando o cliente acessa `www.dietajavca.com.br/fit`, o `TenantContext` tenta encontrar o tenant pelo hostname `www.dietajavca.com.br`, mas no banco consta `pedidos.dietajavca.com.br`. A logica de fallback tenta variantes (sem www, com ilike), mas pode estar falhando ou retornando dados inesperados, causando o erro.

### Problema 2: Projeto pode nao ter sido publicado
A URL publicada atual e `diet-on-demand.lovable.app`. Se o dominio customizado `www.dietajavca.com.br` nao estiver configurado no Lovable, os clientes nao conseguem acessar.

## Solucao

### 1. Atualizar o dominio no banco de dados
Executar SQL para atualizar o tenant:
```sql
UPDATE tenants 
SET domain = 'www.dietajavca.com.br' 
WHERE slug = 'dietaja';
```

### 2. Melhorar o ErrorBoundary com mais informacoes de debug
Adicionar logging do erro real no `ErrorBoundary` para facilitar diagnostico futuro, mostrando o erro no console de forma mais detalhada.

### 3. Apos implementar
- Publicar o projeto no Lovable
- Configurar `www.dietajavca.com.br` como dominio customizado (Settings > Domains)
- DNS: apontar `www.dietajavca.com.br` com registro A para `185.158.133.1`
- Testar as 3 rotas: `/fit`, `/fitness`, `/detox`

