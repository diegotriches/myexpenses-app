import { NextRequest, NextResponse } from "next/server";
import { TransferenciasService } from "@/services/transferenciasService";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da transferência não informado" },
        { status: 400 }
      );
    }

    await TransferenciasService.removerTransferencia(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao excluir transferência",
      },
      { status: 400 }
    );
  }
}