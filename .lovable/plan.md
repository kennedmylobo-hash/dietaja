
# Plano: Separar Sucos e Sopas da Lista de Proteínas

## Problema Identificado

Atualmente, no painel de produção (`ProductionPanel.tsx`), os **sucos** e **sopas** de kits detox são misturados com as proteínas porque:
1. O código processa todos os `item.flavors` como proteínas
2. Não verifica a categoria do flavor (`category: "Suco"` ou `category: "Sopa"`)
3. Exibe tudo em gramas em vez de em unidades/litros

## Regras de Exibição

| Tipo | Unidade Base | Exibição |
|------|--------------|----------|
| Sucos | 300ml | "X un (Y L)" - ex: "3 un (0.9L)" |
| Sopas | 450ml | "X un" - ex: "2 un" |
| Proteínas | gramas | "Xg" ou "X kg" (mantém atual) |

---

## Alterações Técnicas

**Arquivo:** `supabase/functions/send-status-notification/index.ts`
- Remover logs de debug que foram adicionados anteriormente

**Arquivo:** `src/components/admin/ProductionPanel.tsx`

### 1. Modificar processamento de flavors (linhas 199-267)

Verificar a categoria do flavor antes de adicionar no mapa:

```typescript
for (const flavor of item.flavors) {
  const flavorCategory = flavor.category?.toLowerCase() || '';
  
  // Se for suco, adiciona no mapa de sucos
  if (flavorCategory === 'suco') {
    const juiceEmoji = kitJuices.find(j => 
      j.name.toLowerCase() === flavor.name.toLowerCase().replace('suco ', ''))?.emoji || '🥤';
    const key = flavor.name;
    const existing = juiceMap.get(key);
    if (existing) {
      existing.quantity += flavor.quantity;
    } else {
      juiceMap.set(key, { emoji: juiceEmoji, name: flavor.name, quantity: flavor.quantity });
    }
    continue; // Não processa como proteína
  }
  
  // Se for sopa, adiciona no mapa de sopas
  if (flavorCategory === 'sopa') {
    const soupEmoji = kitSoups.find(s => 
      s.name.toLowerCase().includes(flavor.name.toLowerCase().replace('sopa de ', '')))?.emoji || '🥣';
    const key = flavor.name;
    const existing = soupMap.get(key);
    if (existing) {
      existing.quantity += flavor.quantity;
    } else {
      soupMap.set(key, { emoji: soupEmoji, name: flavor.name, quantity: flavor.quantity });
    }
    continue; // Não processa como proteína
  }
  
  // Continua processamento normal para marmitas (proteínas)
  // ... código existente ...
}
```

### 2. Criar função formatJuiceDisplay

```typescript
const JUICE_UNIT_ML = 300;  // Sucos são de 300ml
const SOUP_UNIT_ML = 450;   // Sopas são de 450ml

const formatJuiceDisplay = (quantity: number): string => {
  const totalMl = quantity * JUICE_UNIT_ML;
  const liters = totalMl / 1000;
  return liters >= 1 
    ? `${quantity} un (${liters.toFixed(1)}L)` 
    : `${quantity} un (${totalMl}ml)`;
};

const formatSoupDisplay = (quantity: number): string => {
  return `${quantity} un`;
};
```

### 3. Atualizar exibição nos Cards (linhas 712-763)

**Sucos:**
```tsx
<Badge variant="outline" className="text-lg font-bold">
  {formatJuiceDisplay(juice.quantity)}
</Badge>
```

**Sopas:**
```tsx
<Badge variant="outline" className="text-lg font-bold">
  {formatSoupDisplay(soup.quantity)}
</Badge>
```

### 4. Atualizar impressão (handlePrintProduction)

```typescript
${productionData.juices.length > 0 ? `
  <h2>🥤 SUCOS (300ml/un)</h2>
  ${productionData.juices.map(j => `
    <div class="item">
      <span>${j.emoji} ${j.name}</span>
      <span class="weight">${formatJuiceDisplay(j.quantity)}</span>
    </div>
  `).join('')}
` : ''}

${productionData.soups.length > 0 ? `
  <h2>🥣 SOPAS (450ml/un)</h2>
  ${productionData.soups.map(s => `
    <div class="item">
      <span>${s.emoji} ${s.name}</span>
      <span class="weight">${formatSoupDisplay(s.quantity)}</span>
    </div>
  `).join('')}
` : ''}
```

### 5. Atualizar WhatsApp (handleShareProduction)

```typescript
// Sucos
if (productionData.juices.length > 0) {
  text += `*🥤 SUCOS (300ml/un)*\n`;
  productionData.juices.forEach(j => {
    text += `• ${j.emoji} ${j.name}: *${formatJuiceDisplay(j.quantity)}*\n`;
  });
  text += `\n`;
}

// Sopas
if (productionData.soups.length > 0) {
  text += `*🥣 SOPAS (450ml/un)*\n`;
  productionData.soups.forEach(s => {
    text += `• ${s.emoji} ${s.name}: *${formatSoupDisplay(s.quantity)}*\n`;
  });
  text += `\n`;
}
```

---

## Exemplo do Resultado

**Antes (Proteínas misturadas):**
```
🥩 Proteínas
• Suco Verde: 900g
• Suco Rosa: 900g
• Sopa de Abóbora: 750g
• Frango desfiado: 450g
```

**Depois (Separados):**
```
🥩 Proteínas
• Frango desfiado: 450g
• Carne moída: 300g

🥤 Sucos (300ml/un)
• 🍍 Suco Verde: 3 un (0.9L)
• 🍉 Suco Rosa: 3 un (0.9L)

🥣 Sopas (450ml/un)
• 🎃 Sopa de Abóbora: 2 un
• 🥔 Sopa de Aipim: 2 un
```

---

## Arquivos Modificados

1. `src/components/admin/ProductionPanel.tsx` - Lógica principal de separação
2. `src/components/admin/OrdersManager.tsx` - Remover console.logs de debug
