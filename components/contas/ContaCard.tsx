"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Conta } from "@/types/conta";

import { Pencil, Trash2, FileText, Repeat } from "lucide-react";

interface Props {
  conta: Conta;
  onEditar?: (conta: Conta) => void;
  onExcluir?: (conta: Conta) => void;
  onExtrato?: (conta: Conta) => void;
  onTransferir: (contaOrigemId: string) => void;
}

export default function ContaCard({
  conta,
  onEditar,
  onExcluir,
  onExtrato,
  onTransferir,
}: Props) {
  const bancoImagem = conta.banco
    ? `/contas/${conta.banco.toLowerCase()}.png`
    : null;

  return (
    <Card className="shadow-sm">
      {/* Cabeçalho */}
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        {bancoImagem && (
          <img
            src={bancoImagem}
            alt={conta.banco ?? "Banco"}
            className="w-8 h-8 object-contain"
          />
        )}

        <div className="flex flex-col">
          <span className="font-semibold text-base leading-tight">
            {conta.nome}
          </span>
          <span className="text-xs text-gray-500">
            {conta.tipo === "BANCARIA" ? "Conta Bancária" : "Cartão"}
          </span>
        </div>
      </CardHeader>

      {/* Conteúdo */}
      <CardContent className="space-y-3 text-sm">
        <div>
          <span className="text-gray-500">Saldo Total</span>
          <div className="text-lg font-semibold">
            R$ {conta.saldoAtual.toFixed(2)}
          </div>
        </div>

        <div>
          <span className="text-gray-500">Status</span>
          <div
            className={
              conta.ativo
                ? "text-green-600 font-medium"
                : "text-red-600 font-medium"
            }
          >
            {conta.ativo ? "Ativa" : "Inativa"}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2 flex-wrap">
          {onEditar && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditar(conta)}
              title="Editar conta"
            >
              <Pencil size={16} />
            </Button>
          )}

          {onExtrato && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExtrato(conta)}
              title="Extrato"
            >
              <FileText size={16} />
            </Button>
          )}

          {onTransferir && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTransferir(conta.id)}
              title="Transferir"
            >
              <Repeat size={16} />
            </Button>
          )}

          {onExcluir && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onExcluir(conta)}
              title="Remover conta"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}