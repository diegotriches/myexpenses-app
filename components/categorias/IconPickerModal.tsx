import { iconOptions } from "@/utils/iconOptions";
import { useContext } from "react";

export default function IconPickerModal({ aberto, onClose }: any) {
  if (!aberto) return null;

  // Você pode usar Context ou Zustand para compartilhar o ícone selecionado.
  // Para manter simples, deixei só o layout.

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-[450px] max-h-[500px] overflow-y-auto shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Selecionar Ícone</h2>

        <div className="grid grid-cols-6 gap-4">
          {iconOptions.map(i => {
            const IconComp = i.component;
            return (
              <button
                key={i.name}
                className="p-2 border rounded hover:bg-gray-100"
                onClick={() => {
                  // Pretende salvar ícone no estado global ou via callback
                }}
              >
                <IconComp size={28} />
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
