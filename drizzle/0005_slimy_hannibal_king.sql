ALTER TABLE "cartoes" RENAME COLUMN "dia_fechamento" TO "diaFechamento";--> statement-breakpoint
ALTER TABLE "cartoes" RENAME COLUMN "dia_vencimento" TO "diaVencimento";--> statement-breakpoint
ALTER TABLE "cartoes" RENAME COLUMN "status" TO "ativo";--> statement-breakpoint
ALTER TABLE "cartoes" RENAME COLUMN "ultimos_digitos" TO "ultimosDigitos";--> statement-breakpoint
ALTER TABLE "cartoes" ADD COLUMN "limiteDisponivel" integer;--> statement-breakpoint
ALTER TABLE "cartoes" ADD COLUMN "observacoes" text;