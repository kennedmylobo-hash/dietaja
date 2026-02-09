ALTER TABLE public.tenant_diet_pricing 
ADD COLUMN IF NOT EXISTS subcategory_pricing JSONB DEFAULT '{
  "protein": [
    {"name": "Filé de peito", "costPerKg": 25, "cookingLossPercent": 25, "keywords": ["frango", "peito", "filé", "file", "grelhado", "empanado", "desfiado"]},
    {"name": "Carne bovina", "costPerKg": 35, "cookingLossPercent": 35, "keywords": ["carne", "bovina", "bovino", "patinho", "alcatra", "picanha", "acém", "acem", "moída", "moida", "cubos", "strogonoff", "estrogonofe"]},
    {"name": "Carne suína", "costPerKg": 28, "cookingLossPercent": 30, "keywords": ["porco", "suíno", "suino", "linguiça", "linguica", "costela"]},
    {"name": "Peixe", "costPerKg": 40, "cookingLossPercent": 20, "keywords": ["peixe", "tilápia", "tilapia", "salmão", "salmon", "atum", "camarão", "camarao"]}
  ],
  "carb": [
    {"name": "Arroz", "costPerKg": 6, "cookingLossPercent": 0, "keywords": ["arroz"]},
    {"name": "Aipim", "costPerKg": 10, "cookingLossPercent": 10, "keywords": ["aipim", "mandioca"]},
    {"name": "Batata doce", "costPerKg": 8, "cookingLossPercent": 10, "keywords": ["batata"]},
    {"name": "Macarrão", "costPerKg": 7, "cookingLossPercent": 0, "keywords": ["macarrão", "macarrao", "massa", "espaguete", "penne", "fusilli", "lasanha", "nhoque"]},
    {"name": "Feijão", "costPerKg": 6, "cookingLossPercent": 0, "keywords": ["feijão", "feijao"]}
  ],
  "veggie": []
}'::jsonb;