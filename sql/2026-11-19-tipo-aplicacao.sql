-- Tipo do produto de renda fixa (CDB, LCI, Tesouro Direto...).
-- Rodar no console do Neon ANTES do deploy. Idempotente.
-- Valores: cdb, rdb, lc, lci, lca, cri, cra, debenture, debenture_incentivada, tesouro.
-- Aplicações antigas ficam sem tipo (o card oferece "Definir tipo"), exceto Prefixado e IPCA+,
-- que até hoje só podiam ser do Tesouro.
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS tipo text;
UPDATE aplicacoes SET tipo = 'tesouro' WHERE tipo IS NULL AND indexador IN ('prefixado', 'ipca');
