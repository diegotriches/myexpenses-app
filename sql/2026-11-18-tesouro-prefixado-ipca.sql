-- Tesouro Prefixado e Tesouro IPCA+ (sem cupom) nas aplicações de renda fixa.
-- Rodar no console do Neon ANTES do deploy. Idempotente.
-- taxa_anual: taxa contratada em % a.a. (no IPCA+, a parte acima da inflação). Nula em CDI/Selic.
-- O IPCA mensal (série 433 do Banco Central) fica em taxas_diarias com indexador 'ipca' e data no dia 1º do mês.
ALTER TABLE aplicacoes ADD COLUMN IF NOT EXISTS taxa_anual numeric(7, 4);
