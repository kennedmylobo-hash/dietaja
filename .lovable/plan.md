
# Plano: Gerar PIX pelo Painel Admin

## Objetivo

Adicionar um botão "Gerar PIX" no painel administrativo que permite:
1. Gerar um novo código PIX para pedidos pendentes
2. Copiar o código/link para enviar manualmente
3. Automaticamente enviar por WhatsApp e Email ao cliente

---

## Fluxo do Recurso

```text
┌──────────────────────────────────────────────────────────────┐
│                    Modal Detalhes do Pedido                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Gerar PIX]  <-- Novo botão verde com ícone QR Code        │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │ Gerando PIX...                              │            │
│  │ ✅ PIX gerado: R$ 89,90                     │            │
│  │                                              │            │
│  │ Link: dietajavca.com.br/pix/abc123          │            │
│  │                                              │            │
│  │ [Copiar Link] [Copiar Código PIX]           │            │
│  │                                              │            │
│  │ ✅ WhatsApp enviado                         │            │
│  │ ✅ Email enviado                            │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Nova Edge Function: `generate-pix-admin`

Cria uma nova Edge Function específica para o admin que:
- Recebe `order_id` como parâmetro
- Busca os dados do pedido no banco
- Verifica se já existe PIX gerado (reutiliza se válido)
- Cria novo PIX no Asaas se necessário
- Dispara notificações (WhatsApp + Email)
- Retorna o código PIX e link da página

**Payload de entrada:**
```typescript
{
  order_id: string;
  send_whatsapp?: boolean;  // default: true
  send_email?: boolean;     // default: true
}
```

**Resposta:**
```typescript
{
  success: boolean;
  pix_code: string;
  pix_link: string;
  qr_code_base64: string;
  expiration: string;
  notifications: {
    whatsapp_sent: boolean;
    email_sent: boolean;
  }
}
```

### 2. Atualizar OrdersManager.tsx

**Adicionar no modal de detalhes do pedido:**
- Botão "Gerar PIX" visível apenas para status pendentes
- Modal/Dialog mostrando o resultado com:
  - QR Code visual
  - Código PIX (copia e cola)
  - Link da página de pagamento
  - Botões para copiar cada um
  - Status das notificações enviadas

**Estados necessários:**
```typescript
const [isGeneratingPix, setIsGeneratingPix] = useState<string | null>(null);
const [pixResult, setPixResult] = useState<{
  pix_code: string;
  pix_link: string;
  qr_code_base64: string;
  whatsapp_sent: boolean;
  email_sent: boolean;
} | null>(null);
const [showPixModal, setShowPixModal] = useState(false);
```

**Função para gerar PIX:**
```typescript
const generatePixForOrder = async (orderId: string) => {
  setIsGeneratingPix(orderId);
  try {
    const { data, error } = await supabase.functions.invoke('generate-pix-admin', {
      body: { order_id: orderId, send_whatsapp: true, send_email: true }
    });
    
    if (error) throw error;
    
    setPixResult(data);
    setShowPixModal(true);
    toast({ title: "PIX gerado com sucesso!", description: "Notificações enviadas ao cliente." });
  } catch (err) {
    toast({ title: "Erro ao gerar PIX", variant: "destructive" });
  } finally {
    setIsGeneratingPix(null);
  }
};
```

---

## Interface do Modal PIX

```text
┌─────────────────────────────────────────────────────────────┐
│           💚 PIX Gerado para Pedido #DJA-0042              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────┐                                     │
│  │                   │                                     │
│  │    [QR CODE]      │    R$ 89,90                        │
│  │                   │                                     │
│  └───────────────────┘                                     │
│                                                             │
│  Link da página:                                            │
│  ┌───────────────────────────────────────────┐ [Copiar]    │
│  │ dietajavca.com.br/pix/abc123...           │             │
│  └───────────────────────────────────────────┘             │
│                                                             │
│  Código PIX (copia e cola):                                │
│  ┌───────────────────────────────────────────┐ [Copiar]    │
│  │ 00020126580014br.gov.bcb.pix...           │             │
│  └───────────────────────────────────────────┘             │
│                                                             │
│  ───────────────────────────────────────────               │
│  ✅ WhatsApp enviado para (77) 99100-1658                  │
│  ✅ Email enviado para cliente@email.com                   │
│                                                             │
│                          [Fechar]                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/generate-pix-admin/index.ts` | CRIAR | Nova Edge Function para gerar PIX pelo admin |
| `supabase/config.toml` | EDITAR | Adicionar configuração da nova função |
| `src/components/admin/OrdersManager.tsx` | EDITAR | Adicionar botão e modal de PIX |

---

## Lógica da Edge Function

```typescript
// 1. Buscar pedido no banco
const order = await getOrder(order_id);

// 2. Verificar se já tem PIX válido
if (order.pix_qr_code && order.pix_expiration > now) {
  // Reutilizar PIX existente
  return existingPixData;
}

// 3. Buscar/criar cliente no Asaas
const asaasCustomerId = await getOrCreateAsaasCustomer(order);

// 4. Criar nova cobrança PIX
const pixPayment = await createAsaasPixPayment(asaasCustomerId, order.total);

// 5. Atualizar pedido com dados do PIX
await updateOrderWithPixData(order_id, pixPayment);

// 6. Enviar notificações (em paralelo)
const [whatsappResult, emailResult] = await Promise.all([
  sendWhatsAppNotification(order, pixPayment.payload),
  sendEmailNotification(order, pixPayment)
]);

// 7. Retornar resultado
return {
  success: true,
  pix_code: pixPayment.payload,
  pix_link: `dietajavca.com.br/pix/${order_id}`,
  qr_code_base64: pixPayment.encodedImage,
  expiration: pixPayment.expirationDate,
  notifications: {
    whatsapp_sent: whatsappResult.success,
    email_sent: emailResult.success
  }
};
```

---

## Considerações

1. **Segurança**: A função `generate-pix-admin` deve verificar se o usuário é admin antes de executar
2. **Reutilização**: Se já existe um PIX válido para o pedido, reutiliza em vez de criar novo
3. **Notificações**: O admin pode escolher se quer ou não enviar as notificações
4. **CPF**: A função deve tratar o caso de cliente sem CPF, solicitando que seja preenchido no checkout

---

## Resultado Esperado

- Admin clica em "Gerar PIX" no modal do pedido
- Sistema gera (ou reutiliza) PIX no Asaas
- Modal exibe QR Code e códigos para copiar
- Cliente recebe WhatsApp e Email automaticamente
- Admin pode copiar link e enviar por outros canais se necessário
