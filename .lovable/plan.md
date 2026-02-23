
# Adicionar botão "Editar" nos itens do pedido

## O que será feito
Adicionar um botão de edição em cada item de marmita no modal de detalhes do pedido (tela que mostra "Pedido #d1d4dfba"). Ao clicar, abrirá o modal de composição (OrderConfirmationModal) onde você poderá ajustar pesos, ingredientes e quantidades. As alterações serão salvas no banco de dados para que, ao imprimir para a cozinha, os dados estejam corretos.

## Como vai funcionar
1. Ao lado de cada sabor no modal do pedido, aparecerá um pequeno ícone de lápis (editar)
2. Ao clicar, abrirá o modal de composição com os ingredientes e pesos daquele sabor
3. Você ajusta os pesos (ex: adicionar o peso do Peixe que estava faltando)
4. Ao confirmar, os novos pesos são salvos no banco e o mapa de composições é atualizado na tela
5. As próximas impressões (térmica, produção, WhatsApp) já sairão com os dados corretos

## Detalhes técnicos

### Arquivo: `src/components/admin/OrdersManager.tsx`
- Importar o componente `OrderConfirmationModal` e seus tipos (`ConfirmItem`)
- Adicionar estado para controlar qual item está sendo editado (`editingFlavor`)
- Ao lado de cada sabor no modal de detalhes, renderizar um botao com icone de lapis
- Ao clicar, montar o array de `ConfirmItem` com os dados daquele sabor e abrir o `OrderConfirmationModal`
- No callback `onItemsUpdated`, atualizar o `flavorSidesMap` local para refletir as mudancas imediatamente
- O modal já possui toda a lógica de salvar no banco (tabela `marmita_flavors`), então não será necessário código adicional de persistência

### Arquivo: `src/components/admin/OrderConfirmationModal.tsx`
- Nenhuma alteração necessária -- o componente já suporta edição de composições e salvamento no banco
