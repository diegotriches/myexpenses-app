import crypto from "crypto";
import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { eq } from "drizzle-orm";

interface TransferenciaInput {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  descricao?: string;
  data: string; // Formato: YYYY-MM-DD
}

export class TransferenciasService {
  static async transferir(input: TransferenciaInput) {
    const { contaOrigemId, contaDestinoId, valor, descricao, data } = input;

    if (contaOrigemId === contaDestinoId) {
      throw new Error("Conta de origem e destino não podem ser iguais");
    }

    if (valor <= 0) {
      throw new Error("Valor da transferência deve ser maior que zero");
    }

    return await db.transaction(async (tx) => {
      // 1. Buscar contas
      const [origem] = await tx
        .select()
        .from(contas)
        .where(eq(contas.id, contaOrigemId));

      const [destino] = await tx
        .select()
        .from(contas)
        .where(eq(contas.id, contaDestinoId));

      if (!origem || !destino) {
        throw new Error("Conta de origem ou destino não encontrada");
      }

      if (!origem.ativo || !destino.ativo) {
        throw new Error("Conta inativa não pode participar de transferência");
      }

      const saldoOrigemAtual = Number(origem.saldoAtual);
      
      if (saldoOrigemAtual < valor) {
        throw new Error("Saldo insuficiente na conta de origem");
      }

      // 2. Calcular novos saldos
      const novoSaldoOrigem = saldoOrigemAtual - valor;
      const novoSaldoDestino = Number(destino.saldoAtual) + valor;

      // 3. ID único para vincular as duas movimentações
      const transferenciaId = crypto.randomUUID();
      
      // Garantir formato de data correto (YYYY-MM-DD)
      const dataFormatada = typeof data === 'string' 
        ? data 
        : new Date(data).toISOString().split('T')[0];

      const descricaoTransferencia = descricao || "Transferência entre contas";

      // 4. Registrar SAÍDA no extrato da conta de origem
      await tx.insert(extratoConta).values({
        contaId: contaOrigemId,
        data: dataFormatada,
        tipo: "saida",
        valor: valor.toString(),
        descricao: `${descricaoTransferencia} → ${destino.nome}`,
        saldoApos: novoSaldoOrigem.toString(),
        origem: "TRANSFERENCIA",
        referenciaId: transferenciaId,
      });

      // 5. Registrar ENTRADA no extrato da conta de destino
      await tx.insert(extratoConta).values({
        contaId: contaDestinoId,
        data: dataFormatada,
        tipo: "entrada",
        valor: valor.toString(),
        descricao: `${descricaoTransferencia} ← ${origem.nome}`,
        saldoApos: novoSaldoDestino.toString(),
        origem: "TRANSFERENCIA",
        referenciaId: transferenciaId, // Mesmo ID vincula as duas
      });

      // 6. Atualizar saldos das contas
      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldoOrigem.toString(),
          updatedAt: new Date(),
        })
        .where(eq(contas.id, contaOrigemId));

      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldoDestino.toString(),
          updatedAt: new Date(),
        })
        .where(eq(contas.id, contaDestinoId));

      return {
        transferenciaId,
        contaOrigem: origem.nome,
        contaDestino: destino.nome,
        valor,
        novoSaldoOrigem,
        novoSaldoDestino,
      };
    });
  }

  static async removerTransferencia(transferenciaId: string) {
    return await db.transaction(async (tx) => {
      // 1. Buscar as duas movimentações no extrato
      const movimentacoes = await tx
        .select()
        .from(extratoConta)
        .where(eq(extratoConta.referenciaId, transferenciaId));

      if (movimentacoes.length !== 2) {
        throw new Error("Transferência inválida ou inconsistente");
      }

      const saida = movimentacoes.find(m => m.tipo === "saida");
      const entrada = movimentacoes.find(m => m.tipo === "entrada");

      if (!saida || !entrada) {
        throw new Error("Transferência inconsistente");
      }

      const valor = Number(saida.valor);

      // 2. Buscar saldos atuais das contas
      const [contaOrigem] = await tx
        .select({ saldoAtual: contas.saldoAtual, nome: contas.nome })
        .from(contas)
        .where(eq(contas.id, saida.contaId));

      const [contaDestino] = await tx
        .select({ saldoAtual: contas.saldoAtual, nome: contas.nome })
        .from(contas)
        .where(eq(contas.id, entrada.contaId));

      if (!contaOrigem || !contaDestino) {
        throw new Error("Contas não encontradas");
      }

      // 3. Calcular novos saldos após reversão
      const novoSaldoOrigem = Number(contaOrigem.saldoAtual) + valor;
      const novoSaldoDestino = Number(contaDestino.saldoAtual) - valor;

      // 4. Registrar estornos no extrato
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().split('T')[0];
      const estornoId = crypto.randomUUID();

      // Estorno na conta de origem (reverter saída = entrada)
      await tx.insert(extratoConta).values({
        contaId: saida.contaId,
        data: dataFormatada,
        tipo: "entrada",
        valor: valor.toString(),
        descricao: `Estorno de transferência para ${contaDestino.nome}`,
        saldoApos: novoSaldoOrigem.toString(),
        origem: "ESTORNO",
        referenciaId: estornoId,
      });

      // Estorno na conta de destino (reverter entrada = saída)
      await tx.insert(extratoConta).values({
        contaId: entrada.contaId,
        data: dataFormatada,
        tipo: "saida",
        valor: valor.toString(),
        descricao: `Estorno de transferência de ${contaOrigem.nome}`,
        saldoApos: novoSaldoDestino.toString(),
        origem: "ESTORNO",
        referenciaId: estornoId,
      });

      // 5. Atualizar saldos das contas
      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldoOrigem.toString(),
          updatedAt: new Date(),
        })
        .where(eq(contas.id, saida.contaId));

      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldoDestino.toString(),
          updatedAt: new Date(),
        })
        .where(eq(contas.id, entrada.contaId));

      return {
        transferenciaId,
        estornoId,
        valor,
        contaOrigem: contaOrigem.nome,
        contaDestino: contaDestino.nome,
      };
    });
  }
}