

## Forcar Atualizacao do Cache para Todos os Visitantes

O problema e que navegadores guardam os arquivos JavaScript e CSS antigos no cache. Visitantes que ja acessaram o site antes continuam vendo a versao antiga ate o cache expirar naturalmente (pode levar dias).

### Solucao

Vite ja gera arquivos com hash no nome (ex: `index-abc123.js`), entao quando voce publica uma nova versao, os nomes dos arquivos mudam automaticamente. O problema esta no **cache do `index.html`** — ele e o arquivo que aponta para os demais, e se o navegador guardar uma versao antiga do `index.html`, ele continua carregando os scripts antigos.

### O que sera feito

**1. Meta tags de cache no `index.html`**

Adicionar headers que instruem o navegador a sempre verificar se ha uma versao nova do HTML:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

**2. Configurar headers no Vercel (`vercel.json`)**

Adicionar regra de headers para que o servidor envie instrucoes de cache corretas:
- `index.html`: sempre revalidar (no-cache)
- Arquivos JS/CSS com hash: cache longo (1 ano) — ja que o hash muda quando o conteudo muda

### Resultado

- Visitantes novos e antigos vao sempre carregar a versao mais recente
- Nao precisa pedir para ninguem limpar cache
- Os arquivos JS/CSS continuam sendo cacheados eficientemente (so mudam quando tem atualizacao real)

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `index.html` | Meta tags anti-cache |
| `vercel.json` | Headers de cache para HTML vs assets |

