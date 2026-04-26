"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X, Loader2, Search, MapPin } from "lucide-react";
import { iconOptions } from "@/utils/iconOptions";
import { Estabelecimento, CreateEstabelecimentoDTO, UpdateEstabelecimentoDTO } from "@/types/estabelecimento";

interface Props {
  aberto: boolean;
  onClose: () => void;
  estabelecimento?: Estabelecimento | null;
  onSalvar: (dados: CreateEstabelecimentoDTO | UpdateEstabelecimentoDTO) => Promise<void>;
  salvando?: boolean;
}

// Categorias para filtrar ícones — mesma lógica do CategoriaFormModal
const CATEGORIAS_ICONE = [
  "Todos",
  ...Array.from(new Set(iconOptions.map((i) => i.category))).sort(),
];

const ICONE_PADRAO = "FaStore";

export default function EstabelecimentoFormModal({
  aberto,
  onClose,
  estabelecimento,
  onSalvar,
  salvando = false,
}: Props) {
  const isEdit = Boolean(estabelecimento);

  const [nome,        setNome]        = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [iconeSel,    setIconeSel]    = useState(ICONE_PADRAO);
  const [buscaIcone,  setBuscaIcone]  = useState("");
  const [categoriaIcone, setCategoriaIcone] = useState("Todos");
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  // Preenche o form ao abrir para edição
  useEffect(() => {
    if (aberto) {
      if (estabelecimento) {
        setNome(estabelecimento.nome);
        setLocalizacao(estabelecimento.localizacao ?? "");
        setIconeSel(estabelecimento.icone);
      } else {
        setNome("");
        setLocalizacao("");
        setIconeSel(ICONE_PADRAO);
      }
      setBuscaIcone("");
      setCategoriaIcone("Todos");
      setErrors({});
    }
  }, [aberto, estabelecimento]);

  // Ícones filtrados por categoria + busca
  const iconesFiltrados = useMemo(() => {
    let lista = iconOptions;
    if (categoriaIcone !== "Todos") {
      lista = lista.filter((i) => i.category === categoriaIcone);
    }
    if (buscaIcone.trim()) {
      const q = buscaIcone.trim().toLowerCase();
      lista = lista.filter((i) => i.name.toLowerCase().includes(q));
    }
    return lista;
  }, [categoriaIcone, buscaIcone]);

  const IconeSelecionado = iconOptions.find((i) => i.name === iconeSel)?.component;

  function validar(): boolean {
    const erros: Record<string, string> = {};
    if (!nome.trim()) erros.nome = "Nome é obrigatório";
    if (!iconeSel)    erros.icone = "Selecione um ícone";
    setErrors(erros);
    return Object.keys(erros).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    const dados = {
      nome:        nome.trim(),
      icone:       iconeSel,
      localizacao: localizacao.trim() || undefined,
    };

    await onSalvar(dados);
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 dark:bg-gray-900 dark:border-gray-800">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b dark:border-gray-800">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? "Editar Estabelecimento" : "Novo Estabelecimento"}
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Ex: Mercado Extra, Farmácia São João..."
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (errors.nome) setErrors((p) => { const n = { ...p }; delete n.nome; return n; });
                }}
                className={errors.nome ? "border-red-500" : ""}
              />
              {errors.nome && (
                <p className="text-xs text-red-500 flex items-center gap-1">⚠ {errors.nome}</p>
              )}
            </div>

            {/* Localização */}
            <div className="space-y-2">
              <Label htmlFor="localizacao" className="flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400" />
                Localização <span className="text-gray-400 text-xs font-normal">(opcional)</span>
              </Label>
              <Input
                id="localizacao"
                placeholder="Ex: Rua das Flores, 123 — Centro, São Paulo"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Endereço, bairro ou cidade do estabelecimento
              </p>
            </div>

            {/* Seletor de ícone */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Ícone *
                {IconeSelecionado && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                    — selecionado:
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/40">
                      <IconeSelecionado size={14} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </span>
                )}
              </Label>

              {/* Busca de ícone */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <Input
                  placeholder="Buscar ícone..."
                  value={buscaIcone}
                  onChange={(e) => setBuscaIcone(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Filtro por categoria */}
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIAS_ICONE.slice(0, 10).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaIcone(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      categoriaIcone === cat
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                {CATEGORIAS_ICONE.length > 10 && (
                  <select
                    value={CATEGORIAS_ICONE.includes(categoriaIcone) && CATEGORIAS_ICONE.indexOf(categoriaIcone) >= 10
                      ? categoriaIcone
                      : ""}
                    onChange={(e) => { if (e.target.value) setCategoriaIcone(e.target.value); }}
                    className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-0 cursor-pointer"
                  >
                    <option value="">Mais...</option>
                    {CATEGORIAS_ICONE.slice(10).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Grid de ícones */}
              <div className="h-44 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                {iconesFiltrados.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-gray-400">Nenhum ícone encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-1.5">
                    {iconesFiltrados.map(({ name, component: Icon }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setIconeSel(name);
                          if (errors.icone) setErrors((p) => { const n = { ...p }; delete n.icone; return n; });
                        }}
                        title={name}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          iconeSel === name
                            ? "bg-blue-600 text-white shadow-md scale-110"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400"
                        }`}
                      >
                        <Icon size={18} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.icone && (
                <p className="text-xs text-red-500 flex items-center gap-1">⚠ {errors.icone}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 h-11"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700"
            >
              {salvando ? (
                <><Loader2 size={16} className="mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Save size={16} className="mr-2" />{isEdit ? "Salvar" : "Criar"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}