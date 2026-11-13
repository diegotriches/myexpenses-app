"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Store, Search, X, Plus, Loader2, MapPin } from "lucide-react";
import { iconOptions } from "@/utils/iconOptions";
import { useEstabelecimentos, useCriarEstabelecimento } from "@/hooks/useEstabelecimentos";
import { Estabelecimento } from "@/types/estabelecimento";

interface Props {
  estabelecimentoId: string;
  onChange: (id: string) => void;
}

const ICONE_PADRAO = "FaStore";

export default function MovCampoEstabelecimento({ estabelecimentoId, onChange }: Props) {
  const { data: estabelecimentos = [], isLoading } = useEstabelecimentos();
  const criarEstabelecimento = useCriarEstabelecimento();

  const [busca,          setBusca]          = useState("");
  const [aberto,         setAberto]         = useState(false);
  const [criandoNovo,    setCriandoNovo]    = useState(false);
  const [nomeNovo,       setNomeNovo]       = useState("");
  const [salvandoNovo,   setSalvandoNovo]   = useState(false);

  const inputRef     = useRef<HTMLInputElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);

  // Estabelecimento atualmente selecionado
  const selecionado = useMemo(
    () => estabelecimentos.find((e) => e.id === estabelecimentoId) ?? null,
    [estabelecimentos, estabelecimentoId]
  );

  // Filtra pelo texto digitado
  const filtrados = useMemo(() => {
    if (!busca.trim()) return estabelecimentos;
    const q = busca.trim().toLowerCase();
    return estabelecimentos.filter(
      (e) =>
        e.nome.toLowerCase().includes(q) ||
        e.localizacao?.toLowerCase().includes(q)
    );
  }, [estabelecimentos, busca]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setAberto(false);
        setCriandoNovo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selecionar(e: Estabelecimento) {
    onChange(e.id);
    setBusca("");
    setAberto(false);
  }

  function limpar() {
    onChange("");
    setBusca("");
    setAberto(false);
  }

  // Cria novo estabelecimento inline sem sair do modal
  async function handleCriarNovo() {
    if (!nomeNovo.trim()) return;
    setSalvandoNovo(true);
    try {
      const novo = await criarEstabelecimento.mutateAsync({
        nome:  nomeNovo.trim(),
        icone: ICONE_PADRAO,
      });
      onChange(novo.id);
      setBusca("");
      setNomeNovo("");
      setCriandoNovo(false);
      setAberto(false);
    } catch {
      // erro já tratado pelo hook via toast
    } finally {
      setSalvandoNovo(false);
    }
  }

  // ── Render do item selecionado ────────────────────────────────────────────

  if (selecionado && !aberto) {
    const IconComp = iconOptions.find((i) => i.name === selecionado.icone)?.component;
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Store size={14} className="text-gray-400" />
          Estabelecimento
          <span className="text-gray-400 text-xs font-normal">(opcional)</span>
        </Label>
        <div
          className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
          onClick={() => setAberto(true)}
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            {IconComp
              ? <IconComp size={14} className="text-white" />
              : <Store size={14} className="text-white" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {selecionado.nome}
            </p>
            {selecionado.localizacao && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5 truncate">
                <MapPin size={10} />
                {selecionado.localizacao}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); limpar(); }}
            className="flex-shrink-0 p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Remover estabelecimento"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Render do input + dropdown ────────────────────────────────────────────

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Store size={14} className="text-gray-400" />
        Estabelecimento
        <span className="text-gray-400 text-xs font-normal">(opcional)</span>
      </Label>

      <div className="relative">
        {/* Input de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <Input
            ref={inputRef}
            placeholder={isLoading ? "Carregando..." : "Buscar estabelecimento..."}
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setAberto(true); setCriandoNovo(false); }}
            onFocus={() => setAberto(true)}
            className="pl-9 pr-9 h-10 dark:bg-gray-800 dark:border-gray-700"
            disabled={isLoading}
          />
          {busca && (
            <button
              type="button"
              onClick={() => { setBusca(""); setAberto(true); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {aberto && (
          <div
            ref={dropdownRef}
            className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-y-auto"
          >
            {/* Lista de estabelecimentos filtrados */}
            {filtrados.length > 0 && (
              <div>
                {filtrados.map((e) => {
                  const IconComp = iconOptions.find((i) => i.name === e.icone)?.component;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => selecionar(e)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                        {IconComp
                          ? <IconComp size={13} className="text-white" />
                          : <Store size={13} className="text-white" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {e.nome}
                        </p>
                        {e.localizacao && (
                          <p className="text-xs text-gray-400 truncate flex items-center gap-0.5">
                            <MapPin size={9} />
                            {e.localizacao}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sem resultados */}
            {filtrados.length === 0 && !criandoNovo && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                {busca.trim()
                  ? `Nenhum resultado para "${busca}"`
                  : "Nenhum estabelecimento cadastrado"}
              </div>
            )}

            {/* Separador + opção de criar novo */}
            <div className="border-t border-gray-100 dark:border-gray-700">
              {!criandoNovo ? (
                <button
                  type="button"
                  onClick={() => {
                    setCriandoNovo(true);
                    // Pré-preenche com o texto digitado
                    setNomeNovo(busca.trim());
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors font-medium"
                >
                  <Plus size={15} />
                  {busca.trim()
                    ? `Criar "${busca.trim()}"`
                    : "Criar novo estabelecimento"}
                </button>
              ) : (
                /* Mini-formulário inline para criar novo */
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Novo estabelecimento
                  </p>
                  <Input
                    autoFocus
                    placeholder="Nome do estabelecimento"
                    value={nomeNovo}
                    onChange={(e) => setNomeNovo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleCriarNovo(); }
                      if (e.key === "Escape") setCriandoNovo(false);
                    }}
                    className="h-8 text-sm dark:bg-gray-900 dark:border-gray-600"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Ícone padrão — você pode personalizar depois em Estabelecimentos
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCriandoNovo(false)}
                      className="flex-1 h-7 text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCriarNovo}
                      disabled={!nomeNovo.trim() || salvandoNovo}
                      className="flex-1 h-7 text-xs bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {salvandoNovo ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        "Criar e selecionar"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}