ALTER TABLE "contas" RENAME COLUMN "status" TO "ativo";--> statement-breakpoint
ALTER TABLE "contas" RENAME COLUMN "ultimos_4_digitos" TO "ultimosDigitos";--> statement-breakpoint
ALTER TABLE "contas" RENAME COLUMN "limite_total" TO "limite";--> statement-breakpoint
ALTER TABLE "contas" DROP COLUMN "agencia";--> statement-breakpoint
ALTER TABLE "contas" DROP COLUMN "conta";--> statement-breakpoint
ALTER TABLE "contas" DROP COLUMN "banco_emissor";--> statement-breakpoint
ALTER TABLE "contas" DROP COLUMN "limite_disponivel";