

## Plano: Recuperação em massa de carrinhos abandonados com deep link

### Objetivo
Criar um fluxo onde o admin pode disparar uma mensagem de recuperação para **todos** os carrinhos abandonados de uma vez, e cada mensagem inclui um **deep link** que restaura automaticamente o carrinho do cliente no site.

### Como funciona o deep link

O site receberá um parâmetro `?cart=CART_ID` na URL. O `CartContext` detecta esse parâmetro, busca o carrinho no banco pelo ID, e restaura os itens + dados do cliente automaticamente — sem precisar de login. O cliente cai direto na página com o carrinho pronto para finalizar.

### Mudanças

**1. Deep link no CartContext (`src/components/CartContext.tsx`)**
- No `useEffect` de inicialização, verificar `URLSearchParams` para o param `cart`
- Se presente, buscar o carrinho pelo ID no banco (`carts` table) e restaurar itens + customerInfo
- Salvar no localStorage para persistir a sessão
- Abrir o carrinho automaticamente (ou scrollar para checkout)

**2. Botão "Recuperar Todos" no painel admin (`src/components/admin/AbandonedCartsRecovery.tsx`)**
- Adicionar botão no topo: "📩 Enviar recuperação em massa"
- Ao clicar, chama uma nova edge function que envia a mensagem personalizada para cada carrinho abandonado que ainda não recebeu essa mensagem específica
- Adicionar um campo `recovery_sent_at` na tabela `carts` para controlar o envio (migration)

**3. Nova edge function `send-cart-recovery` (`supabase/functions/send-cart-recovery/index.ts`)**
- Busca todos os carrinhos com status `abandoned` ou `active` (inativos há mais de X tempo) que não tenham `recovery_sent_at`
- Para cada carrinho, monta a mensagem com o template fornecido pelo usuário, incluindo o deep link: `{baseUrl}?cart={cart.id}`
- Envia via Evolution API (WhatsApp)
- Atualiza `recovery_sent_at` no registro

**4. Migration: adicionar coluna `recovery_sent_at`**
```sql
ALTER TABLE carts ADD COLUMN IF NOT EXISTS recovery_sent_at timestamptz;
```

**5. Atualizar mensagens de WhatsApp individuais**
- Os botões existentes "WhatsApp" e "Oferta 10%" também passarão a incluir o deep link do carrinho na mensagem

### Mensagem template
```
🍽️ Seu pedido ainda está salvo!

Vi que você montou seu kit, mas não finalizou.

Deixei tudo separado aqui pra você 👇
Clique e finalize em menos de 1 minuto:

🔗 {link}

Comece a semana organizada, com tudo pesado e pronto.

Posso confirmar para você?
```

### Segurança
- O cart ID é um UUID, difícil de adivinhar
- Nenhum dado sensível é exposto na URL — apenas o ID que permite restaurar o carrinho

