
# Plano: Corrigir Bug do PIX - CPF não é atualizado no cliente Asaas

## Problema Identificado

No arquivo `supabase/functions/create-asaas-pix/index.ts`, há um **bug crítico** na lógica de atualização do CPF do cliente Asaas:

**Linhas 274-287** - A atualização do CPF é feita **SEM validação de resposta**:
```typescript
} else if (cleanCpf.length === 11 && !/^(\d)\1+$/.test(cleanCpf)) {
  // Update existing customer with CPF only if valid
  console.log('Updating existing customer with CPF...');
  await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
    method: 'PUT',
    headers: {
      'access_token': asaasApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cpfCnpj: cleanCpf,
    }),
  });
}
```

**Problemas:**
1. **Nenhuma validação de resposta da API** - O código não verifica se a atualização foi bem-sucedida (`response.ok`)
2. **Nenhum tratamento de erro** - Se o Asaas retornar erro 400, 409 ou qualquer outro, ele é ignorado
3. **Sem log de erro** - Não registra na tabela `payment_error_logs` quando a atualização falha
4. **Fluxo continua mesmo com falha** - Tenta criar o PIX mesmo que o CPF não tenha sido atualizado

**Por isso a Rebeca recebeu o erro:** O sistema tentou criar a cobrança sem o CPF atualizado, e o Asaas respondeu com `"Para criar esta cobrança é necessário preencher o CPF ou CNPJ do cliente."`

## Solução

Modificar `supabase/functions/create-asaas-pix/index.ts` para:

1. **Validar a resposta da API** quando atualizar o CPF
2. **Logar erros de atualização** na tabela `payment_error_logs`
3. **Falhar early** se não conseguir atualizar o CPF (em vez de tentar criar o PIX)
4. **Adicionar logs detalhados** para debug

## Alterações Necessárias

### Arquivo: `supabase/functions/create-asaas-pix/index.ts`

**Seção a ser corrigida (linhas 274-287):**

Substituir:
```typescript
} else if (cleanCpf.length === 11 && !/^(\d)\1+$/.test(cleanCpf)) {
  // Update existing customer with CPF only if valid
  console.log('Updating existing customer with CPF...');
  await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
    method: 'PUT',
    headers: {
      'access_token': asaasApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cpfCnpj: cleanCpf,
    }),
  });
}
```

Por:
```typescript
} else if (cleanCpf.length === 11 && !/^(\d)\1+$/.test(cleanCpf)) {
  // Update existing customer with CPF only if valid
  console.log('Updating existing customer with CPF...');
  const updateResponse = await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
    method: 'PUT',
    headers: {
      'access_token': asaasApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cpfCnpj: cleanCpf,
    }),
  });

  if (!updateResponse.ok) {
    const updateErrorText = await updateResponse.text();
    console.error('Asaas customer CPF update error:', updateResponse.status, updateErrorText);
    
    // Log error to database
    await supabase.from('payment_error_logs').insert({
      order_id: orderId,
      error_code: updateResponse.status.toString(),
      error_message: `Erro ao atualizar CPF do cliente: ${updateErrorText}`,
      provider: 'asaas',
      request_payload: { cpfCnpj: cleanCpf },
      response_payload: JSON.parse(updateErrorText || '{}'),
      customer_phone: customer.phone,
      customer_email: customer.email,
    });

    throw new Error(`Erro ao atualizar CPF do cliente no Asaas. Verifique os dados e tente novamente.`);
  }

  const updateData = await updateResponse.json();
  console.log('Asaas customer CPF updated successfully:', asaasCustomerId);
}
```

## Resultado Esperado

- ✅ CPF será sempre validado e atualizado no cliente Asaas **antes** de criar o PIX
- ✅ Erros de atualização serão logados adequadamente
- ✅ Se houver erro na atualização do CPF, o fluxo é interrompido com uma mensagem clara
- ✅ Cliente receberá mensagem de erro amigável: "Erro ao atualizar CPF do cliente no Asaas. Verifique os dados e tente novamente."
- ✅ Admin poderá ver o erro detalhado em `payment_error_logs`

## Para Rebeca

Após a correção, gerar um novo PIX usando a função `generate-pix-admin` para o pedido `DJA-0113` com o CPF dela devidamente validado.
