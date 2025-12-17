CREATE TABLE "contas" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "nome" varchar(150) NOT NULL,
    "tipo" varchar(20) NOT NULL,
    "status" varchar(20) DEFAULT 'ATIVA' NOT NULL,
    "observacoes" text,
    "saldo_inicial" numeric(14, 2) NOT NULL,
    "saldo_atual" numeric(14, 2) NOT NULL,
    "banco" varchar(100),
    "agencia" varchar(20),
    "conta" varchar(20),
    "banco_emissor" varchar(100),
    "bandeira" varchar(50),
    "ultimos_4_digitos" varchar(4),
    "limite_total" numeric(14, 2),
    "limite_disponivel" numeric(14, 2),
    "fechamento_fatura" integer,
    "vencimento_fatura" integer,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "transacoes" ALTER COLUMN "data" SET DATA TYPE timestamp with time zone;
ALTER TABLE "transacoes" ALTER COLUMN "valor" SET DATA TYPE numeric(14, 2);
ALTER TABLE "transacoes" ADD COLUMN "conta_id" uuid;
INSERT INTO "contas" (nome, tipo, status, saldo_inicial, saldo_atual, created_at, updated_at)
SELECT 'Conta Padrão', 'BANCARIA', 'ATIVA', 0, 0, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "contas" LIMIT 1);
UPDATE "transacoes"
SET conta_id = (SELECT id FROM "contas" LIMIT 1)
WHERE conta_id IS NULL;
ALTER TABLE "transacoes" ALTER COLUMN "conta_id" SET NOT NULL;
ALTER TABLE "transacoes" ADD COLUMN "transferencia_id" uuid;
ALTER TABLE "transacoes"
ADD CONSTRAINT "transacoes_conta_id_contas_id_fk"
FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;