

# Exclusao Manual de Carrinhos Abandonados

## O que muda
Adicionar um botao de "Dispensar" (icone de lixeira) em cada carrinho abandonado na lista e no modal de detalhes. Ao clicar, o status do carrinho sera atualizado para `dismissed`, fazendo com que ele desapareca da listagem sem ser apagado do banco de dados.

## Como funciona
- O carrinho NAO e deletado do banco -- apenas recebe o status `dismissed`
- A query ja filtra por `status IN ('active', 'abandoned')`, entao carrinhos dispensados param de aparecer automaticamente
- Um dialog de confirmacao protege contra cliques acidentais
- Se precisar no futuro, os dados continuam acessiveis no banco

## Alteracoes tecnicas

### Arquivo: `src/components/admin/AbandonedCartsRecovery.tsx`

1. Importar `Trash2` do lucide-react e `AlertDialog` dos componentes UI
2. Criar funcao `dismissCart(cartId)` que faz `UPDATE carts SET status = 'dismissed' WHERE id = cartId`
3. Adicionar botao com icone de lixeira ao lado dos botoes WhatsApp e Oferta em cada card da lista
4. Adicionar botao "Dispensar" tambem no modal de detalhes do carrinho
5. Confirmacao via AlertDialog antes de executar a acao

