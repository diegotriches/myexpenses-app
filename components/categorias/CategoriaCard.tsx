import { BsThreeDotsVertical } from "react-icons/bs";
import { iconOptions } from "@/utils/iconOptions";
import { useState } from "react";
import CategoriaMenu from "@/components/categorias/CategoriaMenu";
import { Categoria } from "app/(dashboard)/categorias/page";

type Props = {
  categoria: Categoria;
  onEditar: () => void;
  onExcluir: () => void;
};

export default function CategoriaCard({ categoria, onEditar, onExcluir }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);

  const IconComp =
    iconOptions.find(i => i.name === categoria.icon)?.component || null;

  return (
    <div className="relative bg-gray-100 p-4 rounded-lg shadow-sm flex flex-col items-center justify-center group">
      <div className="text-4xl mb-2">
        {IconComp ? <IconComp size={40} /> : "📁"}
      </div>

      <span className="font-medium">{categoria.nome}</span>

      <span
        className={`text-xs mt-1 px-2 py-1 rounded ${
          categoria.tipo === "entrada"
            ? "bg-green-200 text-green-800"
            : "bg-red-200 text-red-800"
        }`}
      >
        {categoria.tipo === "entrada" ? "Entrada" : "Saída"}
      </span>

      <button
        onClick={() => setMenuAberto(v => !v)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
      >
        <BsThreeDotsVertical className="text-xl text-gray-600 cursor-pointer" />
      </button>

      {menuAberto && (
        <CategoriaMenu
          onEditar={() => {
            onEditar();
            setMenuAberto(false);
          }}
          onExcluir={() => {
            onExcluir();
            setMenuAberto(false);
          }}
        />
      )}
    </div>
  );
}
