param(
  [switch]$SkipMigrations,
  [switch]$SkipFunctions,
  [switch]$SkipSecrets
)

Write-Host "=== Deploy /site - Dieta Já ===" -ForegroundColor Cyan

# 1. Login
if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "Passo 1: Faça login no Supabase" -ForegroundColor Yellow
  Write-Host "  Crie um token em: https://supabase.com/dashboard/account/tokens" -ForegroundColor Gray
  Write-Host "  Depois execute: supabase login" -ForegroundColor Gray
  npx supabase login
  if ($LASTEXITCODE -ne 0) { Write-Host "Login falhou. Execute manualmente." -ForegroundColor Red; exit 1 }
}

# 2. Link project
Write-Host "`nPasso 2: Link projeto Supabase" -ForegroundColor Yellow
npx supabase link --project-ref fxlhpizydnbdkhuzrkpr
if ($LASTEXITCODE -ne 0) { Write-Host "Link falhou." -ForegroundColor Red; exit 1 }

# 3. Apply migrations
if (-not $SkipMigrations) {
  Write-Host "`nPasso 3: Aplicar migrations" -ForegroundColor Yellow
  npx supabase migration up
  if ($LASTEXITCODE -ne 0) { Write-Host "Migration up falhou." -ForegroundColor Red; exit 1 }
}

# 4. Deploy edge functions
if (-not $SkipFunctions) {
  Write-Host "`nPasso 4: Deploy edge functions" -ForegroundColor Yellow

  $functions = @(
    "create-asaas-pix",
    "create-infinitepay-checkout",
    "asaas-webhook",
    "check-payment-status",
    "send-order-approved",
    "validate-coupon",
    "get-pix-details",
    "cancel-asaas-payment",
    "create-asaas-credit",
    "create-customer-account",
    "create-order-reservation",
    "create-club-subscription",
    "send-order-whatsapp",
    "send-order-confirmation",
    "send-order-pending-email",
    "process-cashback",
    "generate-pix-admin",
    "process-pending-notifications",
    "notificame-webhook",
    "resend-webhook",
    "send-tenant-invite",
    "send-password-reset",
    "send-pending-reminders",
    "send-cart-reminders",
    "send-cart-recovery",
    "send-recompra-campaigns",
    "send-review-request",
    "send-status-notification",
    "send-meal-balance-notification",
    "generate-meal-plan",
    "parse-voice-preferences",
    "generate-ab-variant",
    "meta-capi",
    "cancel-expired-pix",
    "extract-diet-from-image",
    "generate-diet-quote",
    "infinitepay-webhook",
    "notify-license-lead",
    "send-welcome-meal-customer",
    "test-whatsapp-connection"
  )

  foreach ($fn in $functions) {
    Write-Host "  Deploying $fn..." -ForegroundColor Gray
    npx supabase functions deploy $fn --no-verify-jwt
    if ($LASTEXITCODE -ne 0) {
      Write-Host "  $fn falhou. Continuando..." -ForegroundColor Red
    } else {
      Write-Host "  $fn OK" -ForegroundColor Green
    }
  }
  Write-Host "  Todos os functions deployados." -ForegroundColor Green
}

# 5. Set secrets
if (-not $SkipSecrets) {
  Write-Host "`nPasso 5: Configurar secrets" -ForegroundColor Yellow
  Write-Host "  ATENÇÃO: Preencha as chaves reais antes de executar!" -ForegroundColor Red
  Write-Host "  Edite este script ou execute manualmente:" -ForegroundColor Gray
  Write-Host "    supabase secrets set ASAAS_API_KEY=... INFINITEPAY_TOKEN=..." -ForegroundColor Gray
  Write-Host "    supabase secrets set EVOLUTION_API_URL=... EVOLUTION_API_KEY=... EVOLUTION_INSTANCE_NAME=..." -ForegroundColor Gray
  Write-Host "    supabase secrets set RESEND_API_KEY=..." -ForegroundColor Gray

  # Descomente e preencha abaixo:
  # npx supabase secrets set ASAAS_API_KEY="<sua_chave_asaas>"
  # npx supabase secrets set INFINITEPAY_TOKEN="<seu_token_infinitepay>"
  # npx supabase secrets set EVOLUTION_API_URL="<url_evolution_api>"
  # npx supabase secrets set EVOLUTION_API_KEY="<chave_evolution>"
  # npx supabase secrets set EVOLUTION_INSTANCE_NAME="<instancia_evolution>"
  # npx supabase secrets set RESEND_API_KEY="<chave_resend>"
}

Write-Host "`n=== Deploy concluído! ===" -ForegroundColor Cyan
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Supabase Dashboard > SQL Editor > cole e execute: supabase/migrations/20260624000000_tenant_config_site_vendas.sql" -ForegroundColor Gray
Write-Host "2. Supabase Dashboard > Table Editor > tenants > preencha asaas_api_key e demais chaves de integração" -ForegroundColor Gray
Write-Host "3. Faça upload das fotos dos produtos para Storage e atualize image_url em marmita_flavors" -ForegroundColor Gray
Write-Host "4. Acesse http://localhost:8080/site para testar" -ForegroundColor Gray
