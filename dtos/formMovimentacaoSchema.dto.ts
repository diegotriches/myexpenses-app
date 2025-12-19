import { z } from "zod";

export const formMovimentacaoSchema = z
  .object({
    contaId: z.string().nonempty("Conta é obrigatória"),
    tipo: z.enum(["entrada", "saida"] as const, { message: "Tipo é obrigatório" }),
    categoria: z.string().nonempty("Categoria é obrigatória"),
    descricao: z.string().optional(),
    valor: z
      .string()
      .nonempty("Valor é obrigatório")
      .refine((v) => !isNaN(Number(v)), { message: "Valor inválido" }),
    data: z
      .string()
      .nonempty("Data é obrigatória")
      .refine((v) => !isNaN(Date.parse(v)), { message: "Data inválida" }),
    formaPagamento: z.enum(["dinheiro", "pix", "cartao"] as const, {
      message: "Forma de pagamento é obrigatória",
    }),
    cartaoId: z.string().optional(),
    tipoPagamento: z.enum(["avista", "parcelado", "recorrente"] as const, {
      message: "Tipo de pagamento é obrigatório",
    }),
    parcelas: z.number().int().min(1).optional(),
    repeticoes: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.formaPagamento === "cartao" && !data.cartaoId) {
      ctx.addIssue({
        path: ["cartaoId"],
        message: "Cartão é obrigatório quando forma de pagamento for cartão",
        code: z.ZodIssueCode.custom,
      });
    }

    if (data.tipoPagamento === "parcelado" && (data.parcelas === undefined || data.parcelas < 1)) {
      ctx.addIssue({
        path: ["parcelas"],
        message: "Número de parcelas é obrigatório para pagamento parcelado",
        code: z.ZodIssueCode.custom,
      });
    }

    if (data.tipoPagamento === "recorrente" && (data.repeticoes === undefined || data.repeticoes < 1)) {
      ctx.addIssue({
        path: ["repeticoes"],
        message: "Número de repetições é obrigatório para pagamento recorrente",
        code: z.ZodIssueCode.custom,
      });
    }
  });