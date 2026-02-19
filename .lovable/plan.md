
# Corrigir Preview de Links e Resposta HTTP

## Problemas identificados

1. **O Facebook Debugger mostra dados antigos** -- o `index.html` ja foi corrigido no codigo, mas a versao publicada no dominio `pedidos.dietajavca.com.br` pode nao ter sido atualizada ainda.

2. **Codigo de resposta HTTP 418** -- o servidor que serve `www.dietajavca.com.br` esta retornando um codigo invalido. Isso impede crawlers de ler as meta tags corretamente. Esse problema e de DNS/hosting e nao do codigo do Lovable.

3. **PWA manifest ainda tem "PedidoJa"** -- o arquivo `vite.config.ts` contem `short_name: "PedidoJá"` e `name: "Sua Loja - Alimentação Saudável"` no manifest do PWA.

## O que sera feito no codigo

### Arquivo: `vite.config.ts`
Atualizar o manifest do PWA:
- `name`: "Dieta Ja - Alimentacao Saudavel Pronta"
- `short_name`: "Dieta Ja"
- `description`: "Marmitas saudaveis e kits detox prontos para sua rotina"

## O que voce precisa fazer manualmente

1. **Publicar o projeto** -- clique em "Publish" no Lovable para que as alteracoes do `index.html` cheguem ao dominio real
2. **Limpar cache do Facebook** -- apos publicar, volte ao Facebook Sharing Debugger e clique em "Extrair novamente" / "Scrape Again"
3. **Verificar o hosting de `www.dietajavca.com.br`** -- o codigo HTTP 418 indica problema no servidor que faz o redirecionamento de `www.dietajavca.com.br` para `pedidos.dietajavca.com.br`. Verifique nas configuracoes de DNS ou no provedor de hosting se esse redirecionamento esta correto

## Detalhes tecnicos

### Arquivo: `vite.config.ts`
- Localizar o bloco `manifest` dentro do plugin PWA (linhas ~51-55)
- Substituir `name`, `short_name` e `description` pelos dados da Dieta Ja
