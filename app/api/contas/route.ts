import { NextResponse } from "next/server";
import { ContasService } from "@/services/contasService";

export async function GET() {
  try {
    const contas = await ContasService.listar();

    const normalizadas = contas.map((conta) => ({
      ...conta,
      saldoInicial: Number(conta.saldoInicial),
      saldoAtual: Number(conta.saldoAtual),
    }));

    return NextResponse.json(normalizadas);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao buscar contas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Validação básica
    if (!data.nome) {
      return NextResponse.json(
        { message: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const saldoInicial = Number(data.saldoInicial ?? 0);

    if (Number.isNaN(saldoInicial)) {
      return NextResponse.json(
        { message: "Saldo inicial inválido" },
        { status: 400 }
      );
    }

    const conta = await ContasService.criar({
      nome: data.nome,
      ativo: data.ativo ?? true,
      observacoes: data.observacoes ?? null,
      saldoInicial,
      saldoAtual: saldoInicial,
      banco: data.banco ?? null,
    });

    return NextResponse.json(conta, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}