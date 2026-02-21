

# Melhorias no Componente Carrinhos Ativos (LiveCarts)

## Problema
As melhorias recentes (data/hora exata, contagem de acessos, indicador online, botao dispensar) foram aplicadas apenas no componente de Carrinhos Abandonados. O componente de Carrinhos Ativos (`LiveCarts.tsx`) nao recebeu essas mudancas.

## O que sera adicionado

### 1. Data e hora exata do carrinho
Exibir a data e hora de criacao do carrinho (ex: "15/02/2026 14:32") alem do tempo relativo que ja aparece ("ha 4 dias").

### 2. Contagem de acessos do cliente
Consultar quantos carrinhos (historicos) existem para o mesmo telefone. Se houver mais de 1, exibir badge "Nx acessos" indicando cliente recorrente.

### 3. Indicador de online em tempo real
Se o `last_activity_at` do carrinho for dos ultimos 3 minutos, exibir indicador visual de que o cliente esta online agora (ja existe parcialmente com a logica `isRecentActivity` de 2 min — sera ajustado para 3 min para consistencia).

### 4. Botao de dispensar (soft delete)
Adicionar botao de lixeira para marcar o carrinho como `dismissed`, removendo-o da listagem sem apagar do banco. Com confirmacao via AlertDialog.

## Alteracoes tecnicas

### Arquivo: `src/components/admin/LiveCarts.tsx`

1. Importar `Trash2`, `Calendar`, `Repeat`, `Wifi` do lucide-react
2. Importar `AlertDialog` e componentes relacionados
3. Importar `format` do date-fns para formatar data/hora
4. Adicionar estado `accessCounts` (mapa telefone -> quantidade de carrinhos)
5. Adicionar estado `dismissingCartId` para controle do dialog de confirmacao
6. Criar funcao `fetchAccessCounts` que consulta todos os carrinhos agrupados por telefone
7. Criar funcao `dismissCart` que atualiza status para `dismissed`
8. Ajustar `isRecentActivity` para 3 minutos (consistente com AbandonedCartsRecovery)
9. No header de cada carrinho: exibir data/hora formatada, badge de acessos, indicador online
10. Na area expandida: adicionar botao "Dispensar" com confirmacao AlertDialog
11. Adicionar botao de lixeira no header do card para acesso rapido

