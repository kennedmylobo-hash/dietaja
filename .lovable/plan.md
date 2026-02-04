
# Plano: Corrigir Erro 404 nas Landing Pages de Forma Definitiva

## Problema Identificado

O erro 404 ocorre quando clientes acessam diretamente URLs como `pedidos.dietajavca.com.br/fit` ou `/fitness`. Isso é um problema clássico de SPA (Single Page Application) onde o servidor tenta encontrar um arquivo físico para a rota em vez de servir o `index.html` e deixar o React Router gerenciar.

---

## Diagnóstico Técnico

### O que já existe
- `public/_redirects` com `/* /index.html 200` (correto para Netlify)
- Rotas configuradas corretamente no `src/App.tsx`
- Páginas `Fit.tsx` e `Fitness.tsx` existem e funcionam

### O que falta
- Arquivo `vercel.json` para rewrites (caso o deploy seja no Vercel/Lovable)
- Possível problema de cache ou sincronização do deploy

---

## Solução Completa (3 Ações)

### 1. Criar arquivo `vercel.json` na raiz do projeto

Este arquivo garante que TODAS as requisições sejam redirecionadas para o `index.html`, permitindo que o React Router gerencie as rotas.

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 2. Garantir que `_redirects` está no formato correto

O arquivo já existe mas vou confirmar que está sem espaços extras ou problemas de encoding.

### 3. Adicionar `404.html` como fallback adicional

Criar cópia do `index.html` como `404.html` no build - configuração no `vite.config.ts`.

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `vercel.json` (novo) | Criar com rewrites para SPA |
| `vite.config.ts` | Adicionar plugin para copiar index.html como 404.html |

---

## Por que essa solução é definitiva?

```text
+-------------------+      +-------------------+      +-------------------+
|   Cliente acessa  | ---> |   Servidor busca  | ---> |   vercel.json ou  |
|   /fit direto     |      |   arquivo /fit    |      |   _redirects      |
+-------------------+      +-------------------+      +-------------------+
                                    |
                                    v
                           +-------------------+
                           |   Redireciona     |
                           |   para index.html |
                           +-------------------+
                                    |
                                    v
                           +-------------------+
                           |   React Router    |
                           |   renderiza /fit  |
                           +-------------------+
```

---

## Resultado Esperado

Após implementar e publicar:

| URL | Status |
|-----|--------|
| pedidos.dietajavca.com.br/fit | Funcionando |
| pedidos.dietajavca.com.br/fitness | Funcionando |
| pedidos.dietajavca.com.br/detox | Funcionando |
| Acesso direto via link WhatsApp | Funcionando |
| Atualização de página (F5) | Funcionando |
