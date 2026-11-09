-- Estorno de compra no cartão de crédito.
-- Rodar no console do Neon ANTES do deploy. Idempotente.
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS estorno_de_id uuid;
CREATE INDEX IF NOT EXISTS transacoes_estorno_de_id_idx ON transacoes (estorno_de_id);
