ALTER TABLE "cartoes"
ALTER COLUMN "ultimos_digitos"
TYPE integer
USING "ultimos_digitos"::integer;