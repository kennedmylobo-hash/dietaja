
# Teste A/B 100% Automatico com IA

## O que vai mudar

O sistema de Teste A/B vai ganhar duas funcionalidades novas:

### 1. Botao "Gerar com IA" no painel
- Um botao no ABTestManager que, ao clicar, usa IA para analisar o conteudo atual do Hero (titulo, subtitulo, CTA) e gerar automaticamente uma variante B otimizada para conversao
- A IA vai considerar o nicho de marmitas/alimentacao saudavel e criar textos persuasivos
- O teste ja e criado e ativado automaticamente com split 50/50

### 2. Auto-declaracao de vencedor
- O sistema verifica periodicamente (a cada vez que o relatorio e aberto, ou via polling a cada 30 min no painel) se um teste atingiu confianca estatistica >= 95% com minimo de 100 visitantes por variante
- Quando atinge, o teste e encerrado automaticamente, o vencedor e declarado, e o conteudo vencedor e aplicado permanentemente na `tenant_landing_content`
- O admin recebe uma notificacao (toast) quando um teste e concluido automaticamente

---

## Detalhes tecnicos

### Edge Function: `generate-ab-variant`
- Recebe o conteudo atual (titulo, subtitulo, CTA) e o target_section
- Usa Lovable AI (google/gemini-3-flash-preview) para gerar uma variante B otimizada
- Retorna o texto sugerido
- Prompt focado em copywriting para conversao no nicho de alimentacao saudavel

### ABTestManager.tsx - Mudancas
- Novo botao "Gerar com IA" que:
  1. Busca o conteudo atual do Hero da `tenant_landing_content`
  2. Chama a edge function `generate-ab-variant`
  3. Cria o teste automaticamente com variante A (atual) e B (gerada pela IA)
  4. Ativa o teste imediatamente
- Estado de loading enquanto IA gera

### ABTestReport.tsx - Auto-Winner
- Adicionar logica que verifica: se `confidence >= 95` e ambas variantes tem `>= 100 visitantes`, chama mutation para encerrar teste e declarar vencedor
- Quando vencedor e B, atualiza `tenant_landing_content` com o texto vencedor (para que vire o novo "padrao")
- Badge especial "Encerrado automaticamente" para testes auto-concluidos

### Arquivos a criar
- `supabase/functions/generate-ab-variant/index.ts` - Edge function com IA

### Arquivos a modificar
- `src/components/admin/ABTestManager.tsx` - Botao "Gerar com IA" e auto-ativacao
- `src/components/admin/ABTestReport.tsx` - Logica de auto-winner com aplicacao do conteudo vencedor

### Fluxo completo
1. Admin clica "Gerar com IA"
2. Sistema busca conteudo atual do Hero
3. IA gera variante B otimizada
4. Teste e criado e ativado automaticamente (50/50)
5. Visitantes sao distribuidos entre A e B
6. Quando confianca >= 95% com dados suficientes, sistema automaticamente:
   - Declara o vencedor
   - Se B venceu, atualiza o conteudo permanente
   - Encerra o teste
7. Admin ve no painel qual ganhou e pode gerar outro teste
