import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, "..", "supabase", "migrations", "20260623000000_site_vendas_columns_and_seed.sql");

let content = fs.readFileSync(filePath, "utf8");

const replacements = [
  { from: `'["glúten"]'`, to: `ARRAY['glúten']` },
  { from: `'["glúten", "lácteos"]'`, to: `ARRAY['glúten', 'lácteos']` },
  { from: `'["glúten", "lácteos", "ovos"]'`, to: `ARRAY['glúten', 'lácteos', 'ovos']` },
  { from: `'["peixe"]'`, to: `ARRAY['peixe']` },
  { from: `'["peixe", "lácteos"]'`, to: `ARRAY['peixe', 'lácteos']` },
  { from: `'["lácteos"]'`, to: `ARRAY['lácteos']` },
  { from: `'["ovos"]'`, to: `ARRAY['ovos']` },
  { from: `'["glúten", "ovos"]'`, to: `ARRAY['glúten', 'ovos']` },
  { from: `'["restricao_1", "restricao_3"]'`, to: `ARRAY['restricao_1', 'restricao_3']` },
  { from: `'["restricao_3"]'`, to: `ARRAY['restricao_3']` },
  { from: `'["vegetariano"]'`, to: `ARRAY['vegetariano']` },
  { from: `'["vegano", "vegetariano", "sem_gluten", "sem_lacteos"]'`, to: `ARRAY['vegano', 'vegetariano', 'sem_gluten', 'sem_lacteos']` },
  { from: `'["vegano", "vegetariano", "sem_gluten"]'`, to: `ARRAY['vegano', 'vegetariano', 'sem_gluten']` },
  { from: `'["vegano", "vegetariano", "sem_lacteos"]'`, to: `ARRAY['vegano', 'vegetariano', 'sem_lacteos']` },
  { from: `'["vegano", "vegetariano"]'`, to: `ARRAY['vegano', 'vegetariano']` },
  { from: `'["sem_lacteos"]'`, to: `ARRAY['sem_lacteos']` },
  { from: `'["sem_gluten", "sem_lacteos"]'`, to: `ARRAY['sem_gluten', 'sem_lacteos']` },
  { from: `'["sem_gluten"]'`, to: `ARRAY['sem_gluten']` },
  { from: `'[]'`, to: `'{}'` },
];

let total = 0;
for (const { from, to } of replacements) {
  let idx = 0;
  while (true) {
    const found = content.indexOf(from, idx);
    if (found === -1) break;
    content = content.slice(0, found) + to + content.slice(found + from.length);
    idx = found + to.length;
    total++;
  }
}

fs.writeFileSync(filePath, content, "utf8");
console.log(`Fixed ${total} array literals`);

// Verify no JSON arrays remain for allergens/restrictions
const remaining = content.match(/(allergens|restrictions)\s*=\s*'\[.*?\]'/g);
if (remaining) {
  console.log("WARNING: remaining JSON arrays:", remaining);
} else {
  console.log("All allergens/restrictions fixed!");
}
