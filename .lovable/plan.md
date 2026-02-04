

# Plano: Simplificar Notificação - Apenas Link Externo

## Objetivo

Quando houver link de rastreio externo (iFood, 99, Uber), mostrar **apenas esse link** na notificação. Quando não houver, usar o link interno da Dieta Já como fallback.

---

## Alteração Técnica

**Arquivo:** `supabase/functions/send-status-notification/index.ts`

### 1. Atualizar Template do Status "delivering"

```typescript
delivering: {
  title: "Saiu para Entrega!",
  emoji: "🛵", 
  color: "#f59e0b",
  whatsapp: "🛵 *Saiu para Entrega!*\n\nOlá {nome}! Seu pedido *#{pedido}* está a caminho!\n\n{link_rastreio}\n\n⚠️ *Atenção:* A entrega é realizada por parceiros (iFood, 99 ou Uber). Acompanhe o rastreio e confirme se o endereço está correto!",
  email_subject: "🛵 Seu pedido #{pedido} saiu para entrega!"
}
```

### 2. Atualizar Função replaceVariables

Adicionar lógica condicional para `{link_rastreio}`:

```typescript
// Link de rastreio: externo se existir, senão interno
const linkRastreio = order.tracking_link 
  ? `📍 Rastreie em tempo real:\n${order.tracking_link}`
  : `🔗 Acompanhe seu pedido:\n${trackingUrl}`;

return template
  .replace(/{link_rastreio}/g, linkRastreio)
  // ... demais substituições
```

---

## Resultado Final

**COM link externo (iFood/99/Uber):**
```
🛵 *Saiu para Entrega!*

Olá Maria! Seu pedido *#DJA-0079* está a caminho!

📍 Rastreie em tempo real:
https://meupedido.ifood.com.br/49b7d5d5...

⚠️ *Atenção:* A entrega é realizada por parceiros (iFood, 99 ou Uber). 
Acompanhe o rastreio e confirme se o endereço está correto!
```

**SEM link externo (fallback):**
```
🛵 *Saiu para Entrega!*

Olá Maria! Seu pedido *#DJA-0079* está a caminho!

🔗 Acompanhe seu pedido:
https://dietajavca.com.br/pedido/DJA-0079

⚠️ *Atenção:* A entrega é realizada por parceiros (iFood, 99 ou Uber). 
Acompanhe o rastreio e confirme se o endereço está correto!
```

---

## Resumo das Mudanças

| Item | Alteração |
|------|-----------|
| Template WhatsApp | Usar `{link_rastreio}` no lugar dos dois links separados |
| Template Email | Remover seção duplicada, usar apenas link relevante |
| `replaceVariables()` | Nova variável condicional `{link_rastreio}` |

