"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  StickyNote, Plus, X, Trash2, ChevronLeft, Check, Loader2,
  Maximize2, Minimize2, GripHorizontal, Minus,
} from "lucide-react";
import { useNotas, useCriarNota, useAtualizarNota, useExcluirNota } from "@/hooks/useNotas";
import type { Nota, CorNota } from "@/types/nota";
import { COR_CONFIG } from "@/types/nota";

const CORES = Object.keys(COR_CONFIG) as CorNota[];
const AUTO_SAVE_DELAY = 1000;

// ── Constantes de layout ────────────────────────────────────────────────────
const WIDTH_MIN  = 280;
const WIDTH_MAX  = 560;
const HEIGHT_MIN = 320;
const HEIGHT_MAX = 720;
const DEFAULT_WIDTH  = 320;
const DEFAULT_HEIGHT = 460;
const STORAGE_KEY = "notas-panel-layout";
// Margem mínima entre o topo do painel e o topo da tela no mobile,
// pra nunca deixar o painel esticar até tampar a barra de status/notch
const MOBILE_TOP_MARGIN = 120;

interface PanelLayout {
  x: number | null;       // null = posição padrão (canto inferior direito)
  y: number | null;
  width: number;
  height: number;
  isFullscreen: boolean;  // usado apenas no mobile
}

const DEFAULT_LAYOUT: PanelLayout = {
  x: null, y: null,
  width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT,
  isFullscreen: false,
};

function loadLayout(): PanelLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LAYOUT, ...parsed };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout: PanelLayout) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // localStorage indisponível (modo privado etc.) — ignora silenciosamente
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ── Modo edição ───────────────────────────────────────────────────────────────
function EditarNota({ nota, onVoltar }: { nota: Nota; onVoltar: () => void }) {
  const atualizar = useAtualizarNota();
  const excluir   = useExcluirNota();

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
        {/* ✅ NOVO: overscroll-contain — impede que rolar até o fim do texto
            "vaze" o gesto de touch e role a página por trás junto */}
        <Textarea
          value={conteudo}
          onChange={(e) => handleConteudo(e.target.value)}
          placeholder="Escreva sua nota..."
          className="flex-1 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 px-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 min-h-0 overscroll-contain"
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
  const [layout,       setLayout]       = useState<PanelLayout>(DEFAULT_LAYOUT);
  const [hidratado,    setHidratado]    = useState(false);
  const [minimizado,   setMinimizado]   = useState(false);

  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: notas = [], isLoading } = useNotas();
  const criarNota = useCriarNota();

  // Carrega layout salvo apenas no client (evita mismatch de hidratação)
  useEffect(() => {
    const saved = loadLayout();
    // No mobile, se não há posição salva, pré-calcula top/left para evitar
    // salto no primeiro drag (que usa left/top, não bottom/right)
    if (saved.x === null && saved.y === null && window.innerWidth < 768) {
      const largura = Math.min(360, window.innerWidth - 32);
      const altura  = Math.min(saved.height || DEFAULT_HEIGHT, window.innerHeight - MOBILE_TOP_MARGIN);
      saved.x = Math.max(0, window.innerWidth  - largura - 16);
      saved.y = Math.max(0, window.innerHeight - altura  - 80);
    }
    setLayout(saved);
    setHidratado(true);
  }, []);

  // Persiste layout sempre que mudar (debounced via ref simples)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistLayout = useCallback((novo: PanelLayout) => {
    setLayout(novo);
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => saveLayout(novo), 300);
  }, []);

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

  // ── Arrastar (desktop) ──────────────────────────────────────────────────────
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function handleDragStart(e: React.MouseEvent) {
    if (isMobile) return;
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Se ainda não há posição customizada, inicializa com a posição atual na tela
    const origX = layout.x ?? rect.left;
    const origY = layout.y ?? rect.top;

    dragStateRef.current = { startX: e.clientX, startY: e.clientY, origX, origY };

    function onMove(ev: MouseEvent) {
      if (!dragStateRef.current) return;
      const { startX, startY, origX, origY } = dragStateRef.current;
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      const novoX = Math.max(8, Math.min(window.innerWidth  - layout.width  - 8, origX + deltaX));
      const novoY = Math.max(8, Math.min(window.innerHeight - layout.height - 8, origY + deltaY));

      setLayout((prev) => ({ ...prev, x: novoX, y: novoY }));
    }

    function onUp() {
      dragStateRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setLayout((current) => { saveLayout(current); return current; });
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Redimensionar (desktop) ──────────────────────────────────────────────────
  const resizeStateRef = useRef<{ startX: number; startY: number; origW: number; origH: number; origX: number; origY: number } | null>(null);

  function handleResizeStart(e: React.MouseEvent) {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const origX = layout.x ?? rect.left;
    const origY = layout.y ?? rect.top;

    resizeStateRef.current = {
      startX: e.clientX, startY: e.clientY,
      origW: layout.width, origH: layout.height,
      origX, origY,
    };

    function onMove(ev: MouseEvent) {
      if (!resizeStateRef.current) return;
      const { startX, startY, origW, origH, origX, origY } = resizeStateRef.current;
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      const novaLargura = Math.max(WIDTH_MIN,  Math.min(WIDTH_MAX,  origW + deltaX));
      const novaAltura   = Math.max(HEIGHT_MIN, Math.min(HEIGHT_MAX, origH + deltaY));

      setLayout((prev) => ({ ...prev, width: novaLargura, height: novaAltura, x: origX, y: origY }));
    }

    function onUp() {
      resizeStateRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setLayout((current) => { saveLayout(current); return current; });
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Redimensionar verticalmente (mobile, apenas altura) ───────────────────
  // ✅ CORRIGIDO: trocado de Touch Events para Pointer Events. A API de
  // Pointer Events unifica mouse/touch/caneta e oferece setPointerCapture(),
  // que garante — de forma nativa no navegador — que o elemento continue
  // recebendo os eventos de movimento e soltar até o fim do gesto, não
  // importa pra onde o dedo se mova. Isso evita por completo os problemas
  // de listener passivo / touchcancel prematuro que tínhamos com Touch
  // Events, e funciona de forma consistente tanto em touch real quanto na
  // emulação de mouse do DevTools.
  const mobileResizeStateRef = useRef<{ startY: number; origH: number } | null>(null);

  function handleMobileResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isMobile || layout.isFullscreen) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    mobileResizeStateRef.current = { startY: e.clientY, origH: layout.height };
  }

  function handleMobileResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!mobileResizeStateRef.current) return;
    e.preventDefault();
    const { startY, origH } = mobileResizeStateRef.current;
    const deltaY = e.clientY - startY;
    const alturaMax = Math.min(HEIGHT_MAX, window.innerHeight - MOBILE_TOP_MARGIN);
    const novaAltura = Math.max(HEIGHT_MIN, Math.min(alturaMax, origH + deltaY));
    setLayout((prev) => ({ ...prev, height: novaAltura }));
  }

  function handleMobileResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!mobileResizeStateRef.current) return;
    mobileResizeStateRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setLayout((current) => { saveLayout(current); return current; });
  }

  // ── Toggle fullscreen (mobile) ────────────────────────────────────────────
  function toggleFullscreen() {
    persistLayout({ ...layout, isFullscreen: !layout.isFullscreen });
  }

  // ── Drag por touch (mobile, modo janela apenas) ───────────────────────────
  const touchDragOffset = useRef<{ x: number; y: number } | null>(null);

  const onTouchMovePanel = useCallback((e: TouchEvent) => {
    if (!touchDragOffset.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const novoX = Math.max(8, Math.min(
      window.innerWidth  - layout.width  - 8,
      t.clientX - touchDragOffset.current.x
    ));
    const novoY = Math.max(8, Math.min(
      window.innerHeight - layout.height - 8,
      t.clientY - touchDragOffset.current.y
    ));
    setLayout((prev) => ({ ...prev, x: novoX, y: novoY }));
  }, [layout.width, layout.height]);

  const onTouchEndPanel = useCallback(() => {
    touchDragOffset.current = null;
    setLayout((current) => { saveLayout(current); return current; });
    document.removeEventListener("touchmove", onTouchMovePanel);
    document.removeEventListener("touchend",  onTouchEndPanel);
  }, [onTouchMovePanel]);

  function handleTouchDragStart(e: React.TouchEvent) {
    // Só arrasta no mobile em modo janela (não fullscreen)
    if (!isMobile || layout.isFullscreen) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = e.touches[0];
    const origX = layout.x ?? rect.left;
    const origY = layout.y ?? rect.top;
    touchDragOffset.current = {
      x: t.clientX - origX,
      y: t.clientY - origY,
    };
    document.addEventListener("touchmove", onTouchMovePanel, { passive: false });
    document.addEventListener("touchend",  onTouchEndPanel);
  }

  // ── Estilo dinâmico do painel ────────────────────────────────────────────────
  // Altura do header: 44px (py-2 = 8px top+bottom + conteúdo ~28px)
  const HEADER_HEIGHT = 44;

  function getPanelStyle(): React.CSSProperties {
    if (isMobile) {
      if (layout.isFullscreen) {
        return { top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", borderRadius: 0 };
      }
      // ✅ CORRIGIDO: antes usava um valor fixo (440), ignorando layout.height —
      // por isso o resize não tinha efeito nenhum no mobile. Agora usa o
      // mesmo estado que a alça de redimensionar vertical atualiza.
      const alturaMax = Math.min(HEIGHT_MAX, window.innerHeight - MOBILE_TOP_MARGIN);
      const altura  = minimizado ? HEADER_HEIGHT : Math.max(HEIGHT_MIN, Math.min(layout.height, alturaMax));
      const largura = Math.min(360, window.innerWidth - 32);

      if (layout.x !== null && layout.y !== null) {
        return {
          left:   Math.max(0, Math.min(layout.x, window.innerWidth  - largura)),
          top:    Math.max(0, Math.min(layout.y, window.innerHeight - altura)),
          width:  largura,
          height: altura,
        };
      }

      return {
        left:   Math.max(0, window.innerWidth  - largura - 16),
        top:    Math.max(0, window.innerHeight - altura  - 80),
        width:  largura,
        height: altura,
      };
    }

    // Desktop
    const alturaDesktop = minimizado ? HEADER_HEIGHT : layout.height;
    if (layout.x !== null && layout.y !== null) {
      return { left: layout.x, top: layout.y, width: layout.width, height: alturaDesktop };
    }
    return { bottom: 80, right: 24, width: layout.width, height: alturaDesktop };
  }

  useEffect(() => {
    return () => {
      document.removeEventListener("touchmove", onTouchMovePanel);
      document.removeEventListener("touchend",  onTouchEndPanel);
    };
  }, [onTouchMovePanel, onTouchEndPanel]);

  if (!hidratado) return null; // evita flash de posição errada antes de ler localStorage

  return (
    <>
      {/* Painel */}
      <div
        ref={panelRef}
        className={`fixed z-40 rounded-2xl shadow-2xl overflow-hidden
          border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
          ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}
          ${!isMobile && !dragStateRef.current ? "transition-[opacity,transform] duration-300" : ""}`}
        style={getPanelStyle()}
      >
        {notaEditando ? (
          <EditarNota nota={notaEditando} onVoltar={() => setNotaEditando(null)} />
        ) : (
          <div className="flex flex-col h-full">
            {/* Header — arrastável no desktop e no mobile (modo janela) */}
            <div
              onMouseDown={handleDragStart}
              onTouchStart={isMobile && !layout.isFullscreen ? handleTouchDragStart : undefined}
              className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900
                ${!isMobile ? "cursor-move select-none" : ""}
                ${isMobile && !layout.isFullscreen ? "cursor-grab select-none" : ""}`}
            >
              <div className="flex items-center gap-2">
                <GripHorizontal size={14} className="text-gray-400 dark:text-gray-500" />
                <StickyNote size={16} className="text-amber-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notas</span>
                {notas.length > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">({notas.length})</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Nova nota */}
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  onClick={handleNovaNota}
                  disabled={criarNota.isPending}
                  title="Nova nota"
                >
                  {criarNota.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                </Button>
                {/* Fullscreen — mobile apenas */}
                {isMobile && (
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-gray-500"
                    onClick={toggleFullscreen}
                    title={layout.isFullscreen ? "Restaurar" : "Tela cheia"}
                  >
                    {layout.isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </Button>
                )}
                {/* Minimizar */}
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-gray-500"
                  onClick={() => setMinimizado(m => !m)}
                  title={minimizado ? "Expandir" : "Minimizar"}
                >
                  <Minus size={13} />
                </Button>
                {/* Fechar */}
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => onOpenChange(false)}
                  title="Fechar"
                >
                  <X size={13} className="text-gray-500 hover:text-red-500" />
                </Button>
              </div>
            </div>

            {/* Corpo — oculto quando minimizado */}
            {!minimizado && (
              // ✅ NOVO: overscroll-contain — impede que rolar até o fim da
              // lista de notas "vaze" o gesto de touch pra página por trás
              <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
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
            )}
          </div>
        )}

        {/* Handle de resize — desktop, ambos os eixos, canto inferior direito */}
        {!isMobile && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize group"
            title="Arraste para redimensionar"
          >
            <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 border-b-2 border-r-2 border-gray-300 dark:border-gray-600 group-hover:border-amber-400 transition-colors rounded-br-sm" />
          </div>
        )}

        {/* Handle de resize — mobile, só eixo vertical, borda inferior inteira.
            Usa Pointer Events + setPointerCapture, não Touch Events. */}
        {isMobile && !layout.isFullscreen && !minimizado && (
          <div
            onPointerDown={handleMobileResizePointerDown}
            onPointerMove={handleMobileResizePointerMove}
            onPointerUp={handleMobileResizePointerUp}
            onPointerCancel={handleMobileResizePointerUp}
            style={{ touchAction: "none" }}
            className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center cursor-ns-resize"
            title="Arraste para redimensionar a altura"
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
        )}
      </div>

      {/* Backdrop — fecha ao clicar fora (não captura cliques durante drag/resize).
          ✅ CORRIGIDO: sem touchAction:none — permite que a página por trás
          continue rolando normalmente quando o toque acontece fora do painel.
          O bloqueio de scroll vale só dentro do painel (overscroll-contain
          na lista/textarea + preventDefault nos gestos de drag/resize). */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            if (dragStateRef.current || resizeStateRef.current || touchDragOffset.current || mobileResizeStateRef.current) return;
            if (notaEditando) setNotaEditando(null);
            else onOpenChange(false);
          }}
        />
      )}
    </>
  );
}