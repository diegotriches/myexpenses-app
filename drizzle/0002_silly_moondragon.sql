ALTER TABLE "cartoes"
ALTER COLUMN "ultimos_digitos"
TYPE integer
USING "ultimos_digitos"::integer;--> statement-breakpoint
ALTER TABLE "transacoes" ALTER COLUMN "valor" SET DATA TYPE real;