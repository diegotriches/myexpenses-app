ALTER TABLE "cartoes" RENAME COLUMN "diaFechamento" TO "dia_fechamento";--> statement-breakpoint
ALTER TABLE "cartoes" RENAME COLUMN "diaVencimento" TO "dia_vencimento";--> statement-breakpoint
ALTER TABLE "cartoes" ALTER COLUMN "nome" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "cartoes" ALTER COLUMN "tipo" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "cartoes" ADD COLUMN "bandeira" text;--> statement-breakpoint
ALTER TABLE "cartoes" ADD COLUMN "empresa" text;--> statement-breakpoint
ALTER TABLE "cartoes" ADD COLUMN "ultimos_digitos" text;--> statement-breakpoint
ALTER TABLE "cartoes" ADD COLUMN "cor" text;--> statement-breakpoint
ALTER TABLE "cartoes" ADD COLUMN "status" text;