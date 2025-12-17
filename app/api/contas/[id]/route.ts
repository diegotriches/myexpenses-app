import { NextResponse } from "next/server";
import { ContasService } from "@/services/contasService";

interface Params {
  params: {
    id: string;
  };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const {
      createdAt,
      updatedAt,
      ...payload
    } = data;

    const conta = await ContasService.atualizar(id, {
      ...payload,
      saldoAtual:
        payload.saldoAtual !== undefined
          ? Number(payload.saldoAtual)
          : undefined,
    });

    return NextResponse.json(conta);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao atualizar conta" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await ContasService.remover(id);

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    if ((error as Error).message === "NOT_FOUND") {
      return NextResponse.json(
        { message: "Conta não encontrada" },
        { status: 404 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { message: "Erro ao remover conta" },
      { status: 500 }
    );
  }
}