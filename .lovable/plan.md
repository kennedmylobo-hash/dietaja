
# Restaurar Sidebar Fixa no Admin

## Objetivo
Restaurar o layout de sidebar vertical fixa (como na imagem de referencia) no lugar das abas horizontais atuais. Este layout sera permanente.

## Layout da Referencia (imagem)
- Sidebar fixa a esquerda (240px) com fundo branco e borda direita
- Header "Painel Admin / Dieta Ja" no topo da sidebar
- Grupos de menu: OPERACOES, ANALYTICS, GESTAO, MARKETING, ERROS
- Item ativo com fundo verde e texto branco
- Icones ao lado de cada item
- Conteudo principal a direita com filtros no topo
- Mobile: hamburger menu com drawer

## Mudancas

### 1. Admin.tsx - Substituir abas horizontais pela AdminSidebar

- Remover o bloco de `Tabs`/`TabsList`/`TabsTrigger` (linhas 1280-1294)
- Importar e usar o componente `AdminSidebar` que ja existe em `src/components/admin/AdminSidebar.tsx`
- Reestruturar o layout para:
  - Desktop: sidebar fixa 240px a esquerda + conteudo com `ml-60`
  - Mobile: header fixo com hamburger + conteudo com `mt-16`
- Mover os filtros (origem, local, periodo) e botoes (Simular, Sair) para dentro da area de conteudo principal
- Remover imports de `Tabs`, `TabsList`, `TabsTrigger`

### 2. AdminSidebar.tsx - Manter como esta

O componente `AdminSidebar` ja existe e tem exatamente o layout da imagem com todos os grupos e itens necessarios. Nenhuma alteracao necessaria.

## Estrutura Final do Layout

```text
+------------------+------------------------------------------+
| Sidebar (240px)  |  Filtros (origem, local, periodo) + Sair |
| fixo a esquerda  |------------------------------------------|
|                  |                                          |
| OPERACOES        |  Conteudo da secao ativa                 |
|  Ao Vivo         |                                          |
|  Pedidos  [ativo]|                                          |
|  Producao        |                                          |
|  Recorrentes     |                                          |
|  Importar        |                                          |
|                  |                                          |
| ANALYTICS        |                                          |
|  Dashboard       |                                          |
|  Analytics       |                                          |
|  Funil           |                                          |
|  Clientes        |                                          |
|                  |                                          |
| GESTAO           |                                          |
|  Cardapio        |                                          |
|  Estoque         |                                          |
|  Historico       |                                          |
|  Avaliacoes      |                                          |
|                  |                                          |
| MARKETING        |                                          |
|  Campanhas       |                                          |
|  Notificacoes    |                                          |
|  Recuperar       |                                          |
|                  |                                          |
| ERROS            |                                          |
|  Erros PIX       |                                          |
+------------------+------------------------------------------+
```

## Secao Tecnica

**Arquivo modificado:** `src/pages/Admin.tsx`

- Remover imports: `Tabs, TabsList, TabsTrigger`
- Adicionar import: `AdminSidebar` de `@/components/admin/AdminSidebar`
- Trocar o return do dashboard (linhas ~1196-1303) para usar o layout com sidebar:
  - `AdminSidebar` com props `activeSection` e `onSectionChange={setActiveSection}`
  - Main content com `md:ml-60` e `md:pt-0 pt-16`
  - Filtros e botoes dentro do main content como barra de ferramentas
