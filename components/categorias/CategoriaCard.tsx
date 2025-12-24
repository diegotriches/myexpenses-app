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
    <div className="relative bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center group">
  {/* Ícone à esquerda */}
  <div className="flex-shrink-0 mr-4 flex items-center justify-center w-14 h-14 rounded-full bg-gray-50">
    {IconComp ? <IconComp size={36} className="text-gray-700" /> : <span className="text-3xl">📁</span>}
  </div>

  {/* Informações da categoria */}
  <div className="flex-1">
    {/* Nome da categoria */}
    <span className="block text-lg font-semibold text-gray-800">{categoria.nome}</span>

    {/* Badge com círculo */}
    <div className="flex items-center mt-1">
      <span
        className={`w-3.5 h-3.5 rounded-full mr-2 flex-shrink-0 ${
          categoria.tipo === "entrada" ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-xs text-gray-600 font-medium">
        {categoria.tipo === "entrada" ? "Receita" : "Despesa"}
      </span>
    </div>
  </div>

  {/* Botão de menu */}
  <button
    onClick={() => setMenuAberto(v => !v)}
    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
