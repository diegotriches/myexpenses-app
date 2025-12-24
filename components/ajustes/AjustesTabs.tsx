import { BsFillGearFill } from "react-icons/bs";

type AbaProps = {
    label: string;
    value: string;
};

type Props = {
    abas: AbaProps[];
    abaAtiva: string;
    setAba: (v: string) => void;
    titulo?: string;
    descricao?: string;
};

export default function AjustesTabs({
    abas,
    abaAtiva,
    setAba,
}: Props) {
    return (
        <>
            <div className="flex items-center gap-2 mb-3">
                <BsFillGearFill className="text-3xl text-blue-700" />
                <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
            </div>
            <p className="text-gray-600 mb-6">Gerencie as informações da sua conta e personalizações. Altere seus dados, foto ou exclua sua conta se desejar.</p>

            <div className="flex gap-4 border-b mt-4">
                {abas.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setAba(tab.value)}
                        className={`px-4 py-2 font-semibold ${abaAtiva === tab.value
                            ? "border-b-2 border-blue-700 text-blue-700 cursor-pointer"
                            : "text-gray-600 hover:text-gray-800 cursor-pointer"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </>
    );
}