

# Mensagem de Orcamento Formatada para WhatsApp + Botao Copiar

## O que vai mudar

### 1. Nova mensagem formatada para o cliente

A mensagem enviada/copiada para WhatsApp sera profissional e completa, com:

- Numero do orcamento gerado automaticamente (ex: `ORC-2024-0042`)
- Data do orcamento
- Nome do cliente
- Lista detalhada dos itens com peso e preco
- Subtotal por refeicao
- Opcoes de pacotes com descontos
- Informacoes de entrega e pagamento

**Exemplo da mensagem:**

```text
=============================
   RESTAURANTE NOME
   Orcamento Dieta Personalizada
=============================

Orcamento N: ORC-2026-0015
Data: 09/02/2026
Cliente: Maria Silva

------------------------------
ITENS POR REFEICAO:
------------------------------

1. Strogonoff de grao de bico + arroz com brocolis + legumes (300g) -- R$ 24,00
2. Hamburguer de grao de bico + macarrao ao molho branco (300g) -- R$ 24,00

Subtotal por refeicao: R$ 48,00

------------------------------
PACOTES DISPONIVEIS:
------------------------------

Kit 7 dias: R$ 336,00
Kit 14 dias: R$ 319,20 (5% desc.)
Kit 21 dias: R$ 309,12 (8% desc.)
Kit 28 dias: R$ 302,40 (10% desc.)

------------------------------
INFORMACOES IMPORTANTES:
------------------------------

Entrega em ate 3 dias uteis apos confirmacao.
Pedidos confirmados somente apos o pagamento.
Formas de pagamento: PIX ou cartao de credito (link de pagamento).

Duvidas? Estamos a disposicao!
```

A formatacao usara negrito do WhatsApp (`*texto*`) e emojis para ficar visualmente agradavel.

### 2. Novo botao "Copiar Orcamento"

- Adicionado na area de acoes ao lado dos botoes existentes
- Ao clicar, gera o numero do orcamento (sequencial baseado na data + contador)
- Copia a mensagem formatada para a area de transferencia
- Exibe toast de confirmacao "Orcamento copiado!"
- Icone de clipboard/copy

### 3. Numero do orcamento

- Formato: `ORC-AAAA-NNNN` (ano + sequencial de 4 digitos)
- Gerado com base na contagem de orcamentos do tenant no ano atual
- Salvo junto ao orcamento no banco quando copiado/enviado

## Detalhes tecnicos

### Alteracoes em `CustomDietQuoter.tsx`

1. Nova funcao `generateQuoteNumber()` que busca a contagem de orcamentos do ano atual e gera o proximo numero sequencial
2. Nova funcao `buildFormattedMessage()` que monta a mensagem completa com todas as informacoes
3. Novo botao "Copiar Orcamento" usando `navigator.clipboard.writeText()`
4. Atualizar `sendWhatsApp()` para usar a mesma mensagem formatada
5. Incluir o numero do orcamento no payload de salvamento

### Migracao SQL

Adicionar coluna `quote_number TEXT` na tabela `custom_diet_quotes` para persistir o numero gerado.

### Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| Nova migracao SQL | Adicionar coluna `quote_number` em `custom_diet_quotes` |
| `src/components/admin/CustomDietQuoter.tsx` | Funcao de mensagem formatada, botao copiar, numero do orcamento |

