import { iconOptions } from "@/utils/iconOptions";

interface IconPickerModalProps {
  aberto: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
}

export default function IconPickerModal({
  aberto,
  onClose,
  onSelect,
}: IconPickerModalProps) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-[450px] max-h-[500px] overflow-y-auto shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Selecionar Ícone</h2>

        <div className="grid grid-cols-6 gap-4">
          {iconOptions.map((i) => {
            const IconComp = i.component;

            return (
              <button
                key={i.name}
                type="button"
                className="p-2 border rounded hover:bg-gray-100 transition"
                onClick={() => {
                  onSelect(i.name);
                  onClose();
                }}
              >
                <IconComp size={28} />
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
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