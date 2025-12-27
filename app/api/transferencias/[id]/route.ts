import { NextRequest, NextResponse } from "next/server";
import { TransferenciasService } from "@/services/transferenciasService";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da transferência é obrigatório" },
        { status: 400 }
      );
    }

    await TransferenciasService.removerTransferencia(id);

    return NextResponse.json(
      { message: "Transferência removida com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao remover transferência:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao remover transferência" },
      { status: 500 }
    );
  }
}