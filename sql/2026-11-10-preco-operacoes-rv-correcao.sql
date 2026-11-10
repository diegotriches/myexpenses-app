-- OPCIONAL, depois de 2026-11-10-preco-operacoes-rv.sql: recalcula o preço das
-- operações já importadas da B3 a partir do valor guardado na chave de importação
-- (origem_importacao = b3mov|data|ticker|C/V|quantidade|valor|instituição).
-- Só altera compras e vendas importadas (sem evento). Rodar de novo dá o mesmo resultado.

-- 1) Conferência: quantas linhas mudam e a diferença de custo total
SELECT count(*) AS linhas,
       sum(abs(split_part(origem_importacao, '|', 6)::numeric - quantidade * preco_unitario)) AS diferenca_total
FROM operacoes_rv
WHERE origem_importacao LIKE 'b3mov|%'
  AND evento IS NULL
  AND split_part(origem_importacao, '|', 6) ~ '^[0-9]+[.][0-9]{2}$'
  AND quantidade > 0;

-- 2) Correção
UPDATE operacoes_rv
SET preco_unitario = round(split_part(origem_importacao, '|', 6)::numeric / quantidade, 10)
WHERE origem_importacao LIKE 'b3mov|%'
  AND evento IS NULL
  AND split_part(origem_importacao, '|', 6) ~ '^[0-9]+[.][0-9]{2}$'
  AND quantidade > 0;
