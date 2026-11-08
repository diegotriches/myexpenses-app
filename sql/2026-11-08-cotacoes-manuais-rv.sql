-- Cotação manual por usuário (renda variável).
-- Rodar no console do Neon ANTES do deploy. Idempotente.
CREATE TABLE IF NOT EXISTS cotacoes_manuais_rv (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker varchar(12) NOT NULL,
  preco numeric(14, 4) NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticker)
);
