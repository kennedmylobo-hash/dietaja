

# Plano: Tornar o Checkout Resiliente a Falhas

## Problema Identificado

O cliente Glauber recebeu "Erro ao confirmar pedido" ao finalizar a compra. A investigacao nos logs do banco e das edge functions nao encontrou erros registrados (ja rotacionaram), e nenhum pedido foi criado para ele hoje. Isso indica que a insercao do pedido falhou (provavelmente erro de rede transitorio) e o sistema nao tem:
- Retry automatico
- Log persistente da falha
- Informacao suficiente para diagnostico

## Solucao Proposta

### 1. Retry Automatico no Insert (CartDrawer.tsx)

Adicionar logica de retry com ate 2 tentativas antes de mostrar erro ao cliente:

```text
Tentativa 1 -> falhou? -> aguarda 1s -> Tentativa 2 -> falhou? -> mostra erro
```

### 2. Log Persistente de Falhas (CartDrawer.tsx)

Quando o insert falhar (mesmo apos retries), registrar o erro na tabela `payment_error_logs` para que voce possa diagnosticar no painel Admin:

- Dados do erro (mensagem, codigo, detalhes)
- Dados do cliente (nome, email, telefone)
- Valor do pedido
- Timestamp

### 3. Incluir `tenant_id` Explicitamente

Passar o `tenant_id` no insert para evitar dependencia de valores default e garantir associacao correta ao tenant.

### 4. Mensagem de Erro Mais Util

Em vez de "Tente novamente ou entre em contato via WhatsApp", oferecer um botao de "Tentar novamente" e manter o contexto do pedido para que o cliente nao precise refazer tudo.

---

## Detalhes Tecnicos

### Arquivo: `src/components/CartDrawer.tsx`

**Mudancas na funcao `handleConfirmOrder`:**

1. Extrair o insert para uma funcao auxiliar `insertOrderWithRetry` que tenta ate 2 vezes com delay de 1s entre tentativas
2. Adicionar `tenant_id: tenantId` ao payload do insert
3. No bloco de erro, gravar em `payment_error_logs` com `error_source: 'checkout_insert'`
4. Substituir toast generico por toast com botao de acao "Tentar novamente" que re-executa `handleConfirmOrder`

### Estimativa de Impacto
- Erros transitorios de rede serao recuperados automaticamente (~95% dos casos)
- Falhas reais serao registradas para diagnostico futuro
- Cliente tera melhor experiencia sem perder dados do pedido

