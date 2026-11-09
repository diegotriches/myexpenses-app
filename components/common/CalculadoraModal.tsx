"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Check, Minus, X, GripHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_KEY   = "calculadora-posicao";
const LARGURA       = 340;
const SNAP_MARGEM   = 24;
const OFFSET_PADRAO = { x: 24, y: 24 };

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Pos { x: number; y: number }

interface CalculadoraState {
  pos:         Pos;
  fullscreen:  boolean; // mobile apenas
}

interface CalculadoraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function carregarEstado(): CalculadoraState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CalculadoraState;
    // Valida posição
    if (
      parsed.pos &&
      parsed.pos.x >= 0 && parsed.pos.x <= window.innerWidth  - LARGURA &&
      parsed.pos.y >= 0 && parsed.pos.y <= window.innerHeight - 80
    ) return parsed;
    // Posição inválida mas fullscreen é válido
    return { pos: posicaoInicial(), fullscreen: parsed.fullscreen ?? false };
  } catch { return null; }
}

function salvarEstado(state: CalculadoraState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function posicaoInicial(): Pos {
  return {
    x: window.innerWidth  - LARGURA - OFFSET_PADRAO.x,
    y: window.innerHeight - 560     - OFFSET_PADRAO.y,
  };
}

function aplicarSnap(pos: Pos, alturaJanela: number): Pos {
  let { x, y } = pos;
  const maxX = window.innerWidth  - LARGURA;
  const maxY = window.innerHeight - alturaJanela;
  if (x < SNAP_MARGEM)        x = 0;
  if (x > maxX - SNAP_MARGEM) x = maxX;
  if (y < SNAP_MARGEM)        y = 0;
  if (y > maxY - SNAP_MARGEM) y = maxY;
  x = Math.max(0, Math.min(x, maxX));
  y = Math.max(0, Math.min(y, maxY));
  return { x, y };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalculadoraModal({ open, onOpenChange }: CalculadoraModalProps) {
  const [pos,        setPos]        = useState<Pos>({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false); // mobile fullscreen
  const [minimizado, setMinimizado] = useState(false);
  const [display,    setDisplay]    = useState("0");
  const [expressao,  setExpressao]  = useState("");
  const [historico,  setHistorico]  = useState<string[]>([]);
  const [copiado,    setCopiado]    = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const isMobile    = useMediaQuery("(max-width: 767px)");
  const janelRef    = useRef<HTMLDivElement>(null);
  const dragOffset  = useRef<Pos>({ x: 0, y: 0 });
  const posRef      = useRef<Pos>(pos);
  posRef.current    = pos;

  // Inicializa posição + fullscreen ao abrir (durante o render, sem efeito)
  const [abertoAntes, setAbertoAntes] = useState(false);
  if (open !== abertoAntes && typeof window !== "undefined") {
    setAbertoAntes(open);
    if (open) {
      const saved = carregarEstado();
      setPos(saved ? saved.pos : posicaoInicial());
      setFullscreen(saved ? saved.fullscreen : false);
    }
  }

  // ─── Toggle fullscreen (mobile) ────────────────────────────────────────────
  function toggleFullscreen() {
    setFullscreen((prev) => {
      const next = !prev;
      salvarEstado({ pos, fullscreen: next });
      return next;
    });
  }

  // ─── Drag (mouse — desktop) ────────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    const novaPos = {
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    };
    const alturaJanela = janelRef.current?.offsetHeight ?? 500;
    novaPos.x = Math.max(0, Math.min(novaPos.x, window.innerWidth  - LARGURA));
    novaPos.y = Math.max(0, Math.min(novaPos.y, window.innerHeight - alturaJanela));
    setPos(novaPos);
  }, []);

  const onMouseUp = useCallback(() => {
    setArrastando(false);
    const alturaJanela = janelRef.current?.offsetHeight ?? 500;
    setPos(prev => {
      const snapped = aplicarSnap(prev, alturaJanela);
      salvarEstado({ pos: snapped, fullscreen });
      return snapped;
    });
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup",   onMouseUp);
  }, [onMouseMove, fullscreen]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    setArrastando(true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
  }, [onMouseMove, onMouseUp]);

  // ─── Drag (touch — mobile, só no modo janela) ─────────────────────────────
  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault(); // evita scroll da página durante drag
    const t = e.touches[0];
    const novaPos = {
      x: t.clientX - dragOffset.current.x,
      y: t.clientY - dragOffset.current.y,
    };
    const alturaJanela = janelRef.current?.offsetHeight ?? 500;
    novaPos.x = Math.max(0, Math.min(novaPos.x, window.innerWidth  - LARGURA));
    novaPos.y = Math.max(0, Math.min(novaPos.y, window.innerHeight - alturaJanela));
    setPos(novaPos);
  }, []);

  const onTouchEnd = useCallback(() => {
    const alturaJanela = janelRef.current?.offsetHeight ?? 500;
    setPos(prev => {
      const snapped = aplicarSnap(prev, alturaJanela);
      salvarEstado({ pos: snapped, fullscreen });
      return snapped;
    });
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend",  onTouchEnd);
  }, [onTouchMove, fullscreen]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Não arrasta em fullscreen nem ao tocar em botão
    if (fullscreen) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const t = e.touches[0];
    dragOffset.current = {
      x: t.clientX - posRef.current.x,
      y: t.clientY - posRef.current.y,
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend",  onTouchEnd);
  }, [onTouchMove, onTouchEnd, fullscreen]);

  // Cleanup
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onTouchEnd);
    };
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  // ─── Lógica da calculadora ─────────────────────────────────────────────────
  const calcularSeguro = (expr: string): number => {
    try {
      expr = expr.replace(/\s/g, "");
      if (!/^[\d+\-*/.()%]+$/.test(expr)) throw new Error("Caracteres inválidos");
      expr = expr.replace(/(\d+)%/g, "($1/100)");
      const func = new Function(`'use strict'; return (${expr})`);
      const resultado = func();
      if (isNaN(resultado) || !isFinite(resultado)) throw new Error("Resultado inválido");
      return resultado;
    } catch { throw new Error("Erro de cálculo"); }
  };

  const calcular = useCallback(() => {
    try {
      const resultado = calcularSeguro(display);
      const fmt = Number.isInteger(resultado)
        ? resultado.toString()
        : resultado.toFixed(8).replace(/\.?0+$/, "");
      setHistorico(h => [`${display} = ${fmt}`, ...h.slice(0, 9)]);
      setExpressao(display);
      setDisplay(fmt);
    } catch { setDisplay("Erro"); setExpressao(""); }
  }, [display]);

  const handleButtonClick = useCallback((value: string) => {
    if (display === "Erro") { setDisplay("0"); setExpressao(""); }
    if (value === "AC") {
      setDisplay("0"); setExpressao("");
    } else if (value === "⌫") {
      setDisplay(d => d.length > 1 ? d.slice(0, -1) : "0");
    } else if (value === "=") {
      calcular();
    } else if (value === "%") {
      if (display !== "0" && !/[+\-*/.(%]$/.test(display))
        setDisplay(d => d + "%");
    } else if (["+", "-", "*", "/"].includes(value)) {
      if (!/[+\-*/.(%]$/.test(display))
        setDisplay(d => (d === "0" ? "0" : d) + value);
    } else if (value === ".") {
      const ultimo = display.split(/[+\-*/()]/).pop() || "";
      if (!ultimo.includes(".")) setDisplay(d => d + value);
    } else if (value === "(" || value === ")") {
      setDisplay(d => d === "0" ? value : d + value);
    } else {
      setDisplay(d => d === "0" ? value : d + value);
    }
  }, [display, calcular]);

  // Teclado físico
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        document.activeElement !== document.body &&
        !janelRef.current?.contains(document.activeElement)
      ) return;
      e.preventDefault();
      if (e.key >= "0" && e.key <= "9") handleButtonClick(e.key);
      else if (["+", "-", "*", "/", "(", ")", ".", "%"].includes(e.key)) handleButtonClick(e.key);
      else if (e.key === "Enter" || e.key === "=") calcular();
      else if (e.key === "Backspace") handleButtonClick("⌫");
      else if (e.key === "Escape") handleButtonClick("AC");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleButtonClick, calcular]);

  const copiarResultado = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  // ─── Estilo da janela ──────────────────────────────────────────────────────
  function getStyle(): React.CSSProperties {
    if (isMobile && fullscreen) {
      return {
        position: "fixed", inset: 0,
        width: "100%", height: "100%",
        borderRadius: 0, zIndex: 9999,
        boxShadow: "none",
      };
    }
    return {
      position:  "fixed",
      left:      pos.x,
      top:       pos.y,
      width:     LARGURA,
      zIndex:    9999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
    };
  }

  // ─── Botão da calculadora ──────────────────────────────────────────────────
  const renderBotaoCalc = ({
    value, variant = "default", span = 1,
  }: {
    value: string;
    variant?: "default" | "operator" | "equals" | "clear";
    span?: number;
  }) => {
    const estilos = {
      default:  "bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white",
      operator: "bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-100",
      equals:   "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600",
      clear:    "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-100",
    };
    return (
      <Button
        onClick={() => handleButtonClick(value)}
        className={cn("h-12 text-base font-semibold transition-all active:scale-95 rounded-lg", estilos[variant])}
        style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
      >
        {value}
      </Button>
    );
  };

  if (!open) return null;

  return (
    <div
      ref={janelRef}
      style={getStyle()}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden select-none"
    >
      {/* ── Barra de título ──────────────────────────────────────────────── */}
      <div
        onMouseDown={!isMobile ? onDragStart : undefined}
        onTouchStart={isMobile && !fullscreen ? onTouchStart : undefined}
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700",
          "bg-gray-50 dark:bg-gray-900",
          !isMobile && (arrastando ? "cursor-grabbing" : "cursor-grab"),
          isMobile && !fullscreen && "cursor-grab"
        )}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Calculadora
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={copiarResultado} className="h-7 w-7" title="Copiar resultado">
            {copiado
              ? <Check size={13} className="text-green-600" />
              : <Copy  size={13} className="text-gray-500" />}
          </Button>

          {/* ✅ NOVO: toggle fullscreen — mobile apenas */}
          {isMobile && (
            <Button
              variant="ghost" size="icon"
              onClick={toggleFullscreen}
              className="h-7 w-7"
              title={fullscreen ? "Restaurar" : "Tela cheia"}
            >
              {fullscreen
                ? <Minimize2 size={13} className="text-gray-500" />
                : <Maximize2 size={13} className="text-gray-500" />}
            </Button>
          )}

          <Button
            variant="ghost" size="icon"
            onClick={() => setMinimizado(m => !m)}
            className="h-7 w-7"
            title={minimizado ? "Expandir" : "Minimizar"}
          >
            <Minus size={13} className="text-gray-500" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => onOpenChange(false)}
            className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/30"
            title="Fechar"
          >
            <X size={13} className="text-gray-500 hover:text-red-500" />
          </Button>
        </div>
      </div>

      {/* ── Corpo ─────────────────────────────────────────────────────────── */}
      {!minimizado && (
        <div className={cn("p-3", isMobile && fullscreen && "flex flex-col h-[calc(100%-44px)]")}>
          {/* Display */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3 mb-3">
            {expressao && (
              <div className="text-xs text-gray-400 dark:text-gray-500 text-right truncate mb-0.5">
                {expressao}
              </div>
            )}
            <div className={cn(
              "font-bold text-right text-gray-900 dark:text-white break-all leading-tight",
              isMobile && fullscreen ? "text-4xl" : "text-2xl"
            )}>
              {display}
            </div>
          </div>

          {/* Grid de botões — cresce para ocupar a tela em fullscreen */}
          <div className={cn(
            "grid grid-cols-4 gap-1.5 mb-3",
            isMobile && fullscreen && "flex-1"
          )}>
            {renderBotaoCalc({ value: "AC", variant: "clear" })}
            {renderBotaoCalc({ value: "(", variant: "operator" })}
            {renderBotaoCalc({ value: ")", variant: "operator" })}
            {renderBotaoCalc({ value: "⌫", variant: "operator" })}
            {renderBotaoCalc({ value: "7" })}
            {renderBotaoCalc({ value: "8" })}
            {renderBotaoCalc({ value: "9" })}
            {renderBotaoCalc({ value: "/", variant: "operator" })}
            {renderBotaoCalc({ value: "4" })}
            {renderBotaoCalc({ value: "5" })}
            {renderBotaoCalc({ value: "6" })}
            {renderBotaoCalc({ value: "*", variant: "operator" })}
            {renderBotaoCalc({ value: "1" })}
            {renderBotaoCalc({ value: "2" })}
            {renderBotaoCalc({ value: "3" })}
            {renderBotaoCalc({ value: "-", variant: "operator" })}
            {renderBotaoCalc({ value: "0" })}
            {renderBotaoCalc({ value: "." })}
            {renderBotaoCalc({ value: "%", variant: "operator" })}
            {renderBotaoCalc({ value: "+", variant: "operator" })}
            {renderBotaoCalc({ value: "=", variant: "equals", span: 4 })}
          </div>

          {/* Histórico */}
          {historico.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Histórico</span>
                <Button variant="ghost" size="sm" onClick={() => setHistorico([])} className="h-6 text-xs px-2">
                  <Trash2 size={11} className="mr-1" />
                  Limpar
                </Button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {historico.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { setDisplay(item.split(" = ")[1]); setExpressao(""); }}
                    className="w-full text-left px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors truncate text-gray-700 dark:text-gray-300"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}