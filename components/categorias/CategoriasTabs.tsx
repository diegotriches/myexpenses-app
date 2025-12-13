import { BsTags } from "react-icons/bs";
import { MdAdd } from "react-icons/md";

type Props = {
  aba: "entrada" | "saida";
  setAba: (v: "entrada" | "saida") => void;
  onCriar: () => void;
};

export default function CategoriasTabs({ aba, setAba, onCriar }: Props) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <BsTags className="text-3xl text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
      </div>

      <p className="text-gray-600 mb-6">
        Organize as categorias de suas receitas e despesas para melhorar suas análises financeiras.
      </p>

      <div className="flex gap-4 border-b">
        {[
          { label: "Receitas", value: "entrada" },
          { label: "Despesas", value: "saida" },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setAba(tab.value as any)}
            className={`px-4 py-2 font-semibold ${
              aba === tab.value
                ? "border-b-2 border-blue-700 text-blue-700"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={onCriar}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-900"
        >
          <MdAdd /> Nova Categoria
        </button>
      </div>
    </>
  );
}
