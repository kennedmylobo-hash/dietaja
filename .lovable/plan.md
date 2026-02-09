

# Plano: Forcar Atualizacao para Clientes Recorrentes

## Problema Raiz

O site usa um **Service Worker (PWA)** configurado para fazer cache de todos os arquivos:

```text
globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,woff,woff2}"]
```

Quando voce atualiza o cardapio ou o codigo do site, clientes que ja visitaram (como o Glauber) podem estar rodando uma **versao antiga do JavaScript** guardada no cache do Service Worker. Essa versao antiga tenta interagir com o banco de dados atualizado, causando conflitos e erros silenciosos no checkout.

As meta tags `no-cache` no HTML nao resolvem porque o Service Worker **intercepta as requisicoes antes** do navegador checar o servidor.

## Solucao

### 1. Forcar recarga quando houver nova versao (Service Worker)

Alterar a configuracao do PWA em `vite.config.ts` para:
- Usar `skipWaiting: true` e `clientsClaim: true` no Workbox, forcando o novo Service Worker a assumir imediatamente (sem esperar o usuario fechar a aba)
- Remover HTML do `globPatterns` para que o index.html nunca seja servido do cache do SW

### 2. Detectar versao desatualizada no frontend

Criar um pequeno listener em `src/main.tsx` que:
- Detecta quando o Service Worker baixou uma atualizacao
- Forca um `window.location.reload()` automatico para carregar o codigo novo
- Isso garante que o cliente nunca fique preso em uma versao velha do site

### 3. Adicionar versao do app para controle

Incluir uma constante `APP_VERSION` que muda a cada deploy. Se a versao armazenada no localStorage for diferente da atual, limpar caches antigos e recarregar.

## Resultado Esperado

- Clientes recorrentes sempre rodarao a versao mais recente do site
- Atualizacoes no cardapio, precos e checkout serao refletidas imediatamente
- Erros causados por conflito entre codigo antigo e banco novo serao eliminados
- A experiencia continuara rapida (cache ainda funciona, mas e invalidado corretamente)

---

## Detalhes Tecnicos

### Arquivo: `vite.config.ts`

Adicionar `skipWaiting: true` e `clientsClaim: true` na configuracao do Workbox, e adicionar `navigateFallback` para garantir que navegacoes sempre busquem o HTML atualizado:

```text
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  globPatterns: ["**/*.{js,css,ico,png,jpg,jpeg,svg,webp,woff,woff2}"],
  // remover html do glob para nao cachear o index.html
  navigateFallback: null,
  ...
}
```

### Arquivo: `src/main.tsx`

Adicionar deteccao de atualizacao do SW:

```text
// Ao detectar nova versao do SW, recarregar a pagina
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
```

### Arquivo: `src/lib/version-check.ts` (novo)

Criar constante APP_VERSION e logica de verificacao:
- Comparar versao atual com a salva no localStorage
- Se diferente, limpar caches do SW e recarregar
- Atualizar localStorage com a versao nova

### Arquivos afetados
1. `vite.config.ts` - Configuracao do Service Worker
2. `src/main.tsx` - Listener de atualizacao
3. `src/lib/version-check.ts` - Controle de versao (novo arquivo)

