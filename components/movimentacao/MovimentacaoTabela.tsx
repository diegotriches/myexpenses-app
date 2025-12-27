import MovimentacaoLinha from "./MovimentacaoLinha";
import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface Props {
  movimentacoes: Transacao[];
  loading: boolean;
  cartoes: Cartao[];
  onEditar: (mov: Transacao) => void;
  onExcluir: (mov: Transacao) => void;
}

export default function MovimentacaoTabela({
  movimentacoes,
  loading,
  cartoes,
  onEditar,
  onExcluir,
}: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Carregando movimentações...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (movimentacoes.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400">
              <ArrowUpCircle className="h-8 w-8" />
              <ArrowDownCircle className="h-8 w-8" />
            </div>
            <p className="text-gray-600 font-medium">
              Nenhuma movimentação encontrada
            </p>
            <p className="text-sm text-gray-500">
              Adicione uma nova movimentação para começar
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Cabeçalho */}
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Data
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Valor
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Condição
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cartão
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>

            {/* Corpo da tabela */}
            <tbody className="divide-y divide-gray-200">
              {movimentacoes.map((mov) => {
                const cartao = cartoes.find((c) => c.id === mov.cartaoId) || null;

                return (
                  <MovimentacaoLinha
                    key={mov.id}
                    mov={mov}
                    cartao={cartao}
                    onEditar={() => onEditar(mov)}
                    onExcluir={() => onExcluir(mov)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}