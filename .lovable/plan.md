
# Plano: Forçar Publicação das Landing Pages

## Problema Identificado

O erro 404 ocorre porque as novas rotas (`/fit`, `/fitness`, `/detox`) existem no código do editor, mas ainda **não foram publicadas** para o domínio de produção `pedidos.dietajavca.com.br`.

---

## Verificação do Código

As rotas estão corretamente configuradas em `src/App.tsx`:

```typescript
// Linhas 46-48
<Route path="/detox" element={<Detox />} />
<Route path="/fit" element={<Fit />} />
<Route path="/fitness" element={<Fitness />} />
```

---

## Solução

Para forçar o sistema a reconhecer as mudanças e permitir a publicação, vou fazer uma pequena alteração técnica em um dos arquivos:

### Alteração Proposta

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar comentário de versão para forçar detecção de mudança |

```typescript
// v2.0 - Landing pages Fit, Fitness e Detox
const queryClient = new QueryClient();
```

---

## Passos Após Aprovação

1. Eu faço a alteração mínima no código
2. Você clica em **"Publish"** no canto superior direito
3. Clica em **"Update"** para publicar
4. Aguarda alguns segundos para o deploy concluir
5. Testa `pedidos.dietajavca.com.br/fit`

---

## Resultado Esperado

Após publicar:

| URL | Status |
|-----|--------|
| pedidos.dietajavca.com.br/fit | Funcionando |
| pedidos.dietajavca.com.br/fitness | Funcionando |
| pedidos.dietajavca.com.br/detox | Funcionando |
