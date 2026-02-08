

## Reformular o Importador de Pedidos WhatsApp

O componente atual analisa a conversa e tenta criar o pedido direto. A nova versao segue as 7 regras: analisa, identifica o que falta, pede ao admin de forma objetiva, mostra resumo organizado e so lanca apos confirmacao explicita.

### Novos campos obrigatorios

O formulario atual nao tem campos para:
- **Tipo da marmita** (FIT / FITNESS)
- **Data da entrega**
- **Horario da entrega**
- **Status do pagamento** (Pago / A receber)

Esses campos serao adicionados ao estado do componente e ao formulario de revisao.

### Novo fluxo em 3 etapas

```text
Etapa 1: ANALISE
  Admin cola conversa -> clica Analisar
  Sistema extrai o que consegue (nome, telefone, itens, endereco)
  Se faltar informacao obrigatoria:
    -> Mostra lista clara dos campos que faltam (destaque vermelho)
    -> Admin preenche manualmente os campos vazios
    -> Botao "Analisar" vira desabilitado, foco vai para os campos faltantes

Etapa 2: CONFIRMACAO
  Quando TODOS os campos obrigatorios estiverem preenchidos:
    -> Exibe resumo organizado no formato padrao:
       Cliente: Maria Silva
       Pedido: 5x Carne moida, 3x Frango grelhado
       Tipo: FIT 300g
       Entrega: 10/02/2026 - 12:00
       Valor: R$ 134,65
       Pagamento: Pago
       Financeiro: Valor lancado
    -> Botao "Posso lancar esse pedido agora?" fica habilitado

Etapa 3: LANCAMENTO
  Admin confirma -> pedido criado no banco com todos os dados
  Inclui lineType, scheduled_date, scheduled_time, payment_status nos items/order
```

### Mudancas tecnicas no componente

**Novos estados:**
- `lineType`: `'fit' | 'fitness' | null` — tipo da marmita
- `deliveryDate`: `string` — data da entrega (YYYY-MM-DD)
- `deliveryTime`: `string` — horario da entrega (HH:mm)
- `paymentStatus`: `'paid' | 'pending_payment' | null` — pago ou a receber
- `step`: `'input' | 'review' | 'confirmed'` — controle do fluxo
- `missingFields`: `string[]` — lista de campos faltantes

**Logica de validacao (checkMissingFields):**
Apos analise e a cada mudanca de campo, recalcula quais campos obrigatorios estao vazios:
1. Nome do cliente
2. Itens do pedido (pelo menos 1)
3. Tipo FIT/FITNESS
4. Data da entrega
5. Horario da entrega
6. Valor total (> 0)
7. Status do pagamento

Se `missingFields.length === 0`, habilita o botao de revisao/confirmacao.

**Resumo formatado:**
Antes do botao "Lancar Pedido", exibe um card verde com o resumo organizado seguindo o padrao das regras (Cliente, Pedido, Tipo, Entrega, Valor, Pagamento, Financeiro).

**Gravacao no banco:**
Ao criar o pedido, inclui os novos campos:
- `lineType` em cada item
- `status`: se pagamento "Pago" -> `approved`, se "A receber" -> `whatsapp_pending`
- Metadata com data/horario de entrega agendados

### Campos faltantes (UI)

Quando faltar informacao, aparece um bloco amarelo/vermelho no topo do formulario:

```text
⚠️ Para lancar esse pedido, preciso das seguintes informacoes:
  * Tipo do pedido (FIT ou FITNESS)
  * Data da entrega
  * Horario da entrega
  * Status do pagamento (pago ou a receber)
```

Cada campo faltante tera destaque visual (borda vermelha) no formulario.

### Arquivo alterado

| Arquivo | Mudanca |
|---|---|
| `src/components/admin/WhatsAppOrderImporter.tsx` | Adicionar campos FIT/FITNESS, data, horario, pagamento. Fluxo de validacao com lista de faltantes. Resumo formatado antes de confirmar. Gravar lineType e status correto. |

