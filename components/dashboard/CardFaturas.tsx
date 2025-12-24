import { DashboardCartao } from "@/types/dashboard";

interface Props {
  cartao: DashboardCartao;
}

export function CardFaturas({ cartao }: Props) {
  return (
    <div className="border rounded-xl p-4 flex justify-between items-center">
      <div>
        <p className="font-medium">{cartao.nome}</p>
        <p className="text-sm text-gray-500">
          Fatura do mês
        </p>
      </div>

      <div className="text-right">
        <p className="font-semibold">
          R$ {cartao.totalFatura.toFixed(2)}
        </p>

        {cartao.paga ? (
          <span className="text-xs text-green-600">Paga</span>
        ) : (
          <span className="text-xs text-red-600">Em aberto</span>
        )}
      </div>
    </div>
  );
}
