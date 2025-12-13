import api from "@/services/api";
import { Categoria } from "app/(dashboard)/categorias/page";

export default function ConfirmDeleteModal({
  aberto,
  onClose,
  categoria,
  refresh
}: {
  aberto: boolean;
  onClose: () => void;
  categoria: Categoria | null;
  refresh: () => void;
}) {
  if (!aberto || !categoria) return null;

  const excluir = async () => {
    try {
      await api.delete(`/categorias/${categoria.id}`);
      refresh();
      onClose();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-[380px] shadow-lg">
        <h2 className="text-xl font-semibold text-center mb-4">
          Confirmar Exclusão
        </h2>

        <p className="text-gray-700 text-center mb-6">
          Tem certeza de que deseja excluir "{categoria.nome}"?
          Esta ação não pode ser desfeita.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancelar
          </button>

          <button
            onClick={excluir}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
