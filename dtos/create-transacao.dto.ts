import { z } from "zod";

export const createTransacaoDTO = z.object({
  data: z.preprocess(
    (val) => {
      if (val instanceof Date) return val;
      if (typeof val === "string" || typeof val === "number") {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;
      }
      return undefined;
    },
    z.date()
  ),

  tipo: z.enum(["entrada", "saida"]),

  descricao: z.string().min(1).nullable().optional(),

  valor: z
    .union([z.string(), z.number()])
    .transform((v) => v.toString()),

  categoria: z.string().nullable().optional(),

  formaPagamento: z.enum(["dinheiro", "pix", "cartao"]).default("dinheiro"),

  contaId: z.string().uuid(),

  cartaoId: z.number().int().nullable().optional(),

  // Parcelamento
  parcelado: z.boolean().optional().default(false),
  parcelamentoId: z.string().uuid().nullable().optional(),
  parcelas: z.number().int().nullable().optional(),
  parcelaAtual: z.number().int().nullable().optional(),

  // Recorrência
  recorrente: z.boolean().optional().default(false),
  recorrenciaId: z.string().uuid().nullable().optional(),
  repeticoes: z.number().int().nullable().optional(),
})
.refine(
  (data) =>
    data.formaPagamento !== "cartao" || data.cartaoId !== null,
  {
    message: "cartaoId é obrigatório quando formaPagamento = cartao",
    path: ["cartaoId"],
  }
);