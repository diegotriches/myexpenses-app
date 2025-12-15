ALTER TABLE "transacoes" RENAME COLUMN "parcela" TO "parcelaAtual";--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "recorrenciaId" varchar(36);--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "repeticoes" integer;--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "parcelado" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "parcelamentoId" varchar(36);--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "parcelas" integer;--> statement-breakpoint
ALTER TABLE "cartoes" DROP COLUMN "limiteDisponivel";