import { MdEdit, MdDelete } from "react-icons/md";

export default function CategoriaMenu({ onEditar, onExcluir }: any) {
  return (
    <div className="absolute right-2 top-10 bg-white border shadow-md rounded-md p-1 z-10">
      <button
        onClick={onEditar}
        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-100"
      >
        <MdEdit /> Editar
      </button>
      <button
        onClick={onExcluir}
        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-100 text-red-600"
      >
        <MdDelete /> Excluir
      </button>
    </div>
  );
}
