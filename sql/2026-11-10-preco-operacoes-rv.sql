-- Preço unitário das operações de renda variável com 10 casas decimais.
-- Na importação da B3 o preço é valor ÷ quantidade; com 4 casas o custo
-- ficava alguns centavos diferente do valor da planilha.
-- Rodar no console do Neon ANTES do deploy. Idempotente (só amplia a escala).
ALTER TABLE operacoes_rv ALTER COLUMN preco_unitario TYPE numeric(20, 10);
