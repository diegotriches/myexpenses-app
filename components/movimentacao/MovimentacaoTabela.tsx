import MovimentacaoLinha from "./MovimentacaoLinha";
import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";

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
    return <p className="text-gray-600">Carregando movimentações...</p>;
  }

  if (movimentacoes.length === 0) {
    return (
      <p className="text-gray-600">
        Nenhuma movimentação encontrada. Adicione uma nova movimentação.
      </p>
    );
  }

  return (
    <div className="space-y-3">

      {/* Cabeçalho */}
      <div className="grid grid-cols-8 gap-3 font-semibold text-gray-700 px-4 py-2">
        <p>Data</p>
        <p>Descrição</p>
        <p>Tipo</p>
        <p>Categoria</p>
        <p>Valor</p>
        <p>Pagamento</p>
        <p>Condição</p>
        <p>Cartão</p>
      </div>

      {/* Linhas */}
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
    </div>
  );
}