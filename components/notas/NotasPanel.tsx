"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  StickyNote, Plus, X, Trash2, ChevronLeft, Check, Loader2,
} from "lucide-react";
import { useNotas, useCriarNota, useAtualizarNota, useExcluirNota } from "@/hooks/useNotas";
import type { Nota, CorNota } from "@/types/nota";
import { COR_CONFIG } from "@/types/nota";

const CORES = Object.keys(COR_CONFIG) as CorNota[];
const AUTO_SAVE_DELAY = 1000;

// ── Modo edição ───────────────────────────────────────────────────────────────
function EditarNota({ nota, onVoltar }: { nota: Nota; onVoltar: () => void }) {
  const atualizar  = useAtualizarNota();
  const excluir    = useExcluirNota();

  const [titulo,   setTitulo]   = useState(nota.titulo);
  const [conteudo, setConteudo] = useState(nota.conteudo);
  const [cor,      setCor]      = useState<CorNota>(nota.cor as CorNota);
  const [salvando, setSalvando] = useState(false);
  const [salvou,   setSalvou]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config   = COR_CONFIG[cor];

  const salvarDebounced = useCallback(
    (t: string, c: string, co: CorNota) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setSalvando(true);
        try {
          await atualizar.mutateAsync({ id: nota.id, dados: { titulo: t, conteudo: c, cor: co } });
          setSalvou(true);
          setTimeout(() => setSalvou(false), 2000);
        } finally {
          setSalvando(false);
        }
      }, AUTO_SAVE_DELAY);
    },
    [nota.id, atualizar]
  );

  function handleTitulo(v: string)   { setTitulo(v);   salvarDebounced(v, conteudo, cor); }
  function handleConteudo(v: string) { setConteudo(v); salvarDebounced(titulo, v, cor);   }
  function handleCor(c: CorNota)     { setCor(c);       salvarDebounced(titulo, conteudo, c); }

  async function handleExcluir() {
    await excluir.mutateAsync(nota.id);
    onVoltar();
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className={`flex flex-col h-full ${config.bg}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${config.header} border-b ${config.border}`}>
        <button
          onClick={onVoltar}
          className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft size={14} />
          Notas
        </button>
        <div className="flex items-center gap-2">
          {salvando && <Loader2 size={12} className="animate-spin text-gray-400" />}
          {salvou   && <Check   size={12} className="text-green-500" />}
          <div className="flex items-center gap-1">
            {CORES.map((c) => (
              <button
                key={c}
                title={COR_CONFIG[c].label}
                onClick={() => handleCor(c)}
                className={`w-4 h-4 rounded-full ${COR_CONFIG[c].dot} transition-transform ${
                  c === cor ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : "hover:scale-110"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleExcluir}
            disabled={excluir.isPending}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Excluir nota"
          >
            {excluir.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">
        <Input
          value={titulo}
          onChange={(e) => handleTitulo(e.target.value)}
          placeholder="Título"
          maxLength={100}
          className="border-0 bg-transparent text-sm font-semibold focus-visible:ring-0 px-0 h-7 text-gray-900 dark:text-white placeholder:text-gray-400"
        />
        <Textarea
          value={conteudo}
          onChange={(e) => handleConteudo(e.target.value)}
          placeholder="Escreva sua nota..."
          className="flex-1 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 px-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 min-h-0"
        />
      </div>
    </div>
  );
}

// ── Card de nota ──────────────────────────────────────────────────────────────
function NotaCard({ nota, onClick }: { nota: Nota; onClick: () => void }) {
  const config = COR_CONFIG[nota.cor as CorNota] ?? COR_CONFIG.yellow;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${config.bg} ${config.border}`}
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
        {nota.titulo || <span className="italic text-gray-400 font-normal">Sem título</span>}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
        {nota.conteudo || <span className="italic">Nota vazia</span>}
      </p>
      <div className={`mt-2 w-3 h-1 rounded-full ${config.dot} opacity-60`} />
    </button>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────
interface NotasPanelProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotasPanel({ open, onOpenChange }: NotasPanelProps) {
  const [notaEditando, setNotaEditando] = useState<Nota | null>(null);

  const { data: notas = [], isLoading } = useNotas();
  const criarNota = useCriarNota();

  async function handleNovaNota() {
    const nova = await criarNota.mutateAsync({ titulo: "", conteudo: "", cor: "yellow" });
    setNotaEditando(nova);
  }

  // Fecha ao pressionar Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (notaEditando) setNotaEditando(null);
      else onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [notaEditando, onOpenChange]);

  // Reseta nota editando ao fechar
  useEffect(() => {
    if (!open) setNotaEditando(null);
  }, [open]);

  return (
    <>
      {/* Painel */}
      <div
        className={`fixed bottom-20 right-6 z-40 w-80 rounded-2xl shadow-2xl overflow-hidden
          border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
          transition-all duration-300 origin-bottom-right
          ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
        style={{ height: "460px" }}
      >
        {notaEditando ? (
          <EditarNota nota={notaEditando} onVoltar={() => setNotaEditando(null)} />
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <StickyNote size={16} className="text-amber-500" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Notas</span>
                {notas.length > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">({notas.length})</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  onClick={handleNovaNota}
                  disabled={criarNota.isPending}
                  title="Nova nota"
                >
                  {criarNota.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => onOpenChange(false)}
                  title="Fechar"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={24} className="animate-spin text-gray-300" />
                </div>
              ) : notas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-6">
                  <StickyNote size={40} className="text-gray-200 dark:text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma nota ainda</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Clique em + para criar sua primeira nota</p>
                  </div>
                </div>
              ) : (
                notas.map((nota) => (
                  <NotaCard key={nota.id} nota={nota} onClick={() => setNotaEditando(nota)} />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop — fecha ao clicar fora */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            if (notaEditando) setNotaEditando(null);
            else onOpenChange(false);
          }}
        />
      )}
    </>
  );
}