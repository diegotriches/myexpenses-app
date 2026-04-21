"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Check, Minus, X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_KEY  = "calculadora-posicao";
const LARGURA      = 340;   // px — largura fixa da janela
const SNAP_MARGEM  = 24;    // px — distância da borda para acionar snap
const OFFSET_PADRAO = { x: 24, y: 24 }; // canto inferior direito (calculado no mount)

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Pos { x: number; y: number }

interface CalculadoraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function carregarPosicao(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw) as Pos;
    // Valida se ainda está dentro da janela atual
    if (
      pos.x >= 0 && pos.x <= window.innerWidth  - LARGURA &&
      pos.y >= 0 && pos.y <= window.innerHeight - 80
    ) return pos;
    return null;
  } catch { return null; }
}

function salvarPosicao(pos: Pos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
}

function posicaoInicial(): Pos {
  const salva = carregarPosicao();
  if (salva) return salva;
  // Canto inferior direito por padrão
  return {
    x: window.innerWidth  - LARGURA - OFFSET_PADRAO.x,
    y: window.innerHeight - 560     - OFFSET_PADRAO.y,
  };
}

function aplicarSnap(pos: Pos, alturaJanela: number): Pos {
  let { x, y } = pos;
  const maxX = window.innerWidth  - LARGURA;
  const maxY = window.innerHeight - alturaJanela;

  // Snap horizontal
  if (x < SNAP_MARGEM)       x = 0;
  if (x > maxX - SNAP_MARGEM) x = maxX;

  // Snap vertical
  if (y < SNAP_MARGEM)       y = 0;
  if (y > maxY - SNAP_MARGEM) y = maxY;

  // Garante dentro dos limites
  x = Math.max(0, Math.min(x, maxX));
  y = Math.max(0, Math.min(y, maxY));

  return { x, y };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalculadoraModal({ open, onOpenChange }: CalculadoraModalProps) {
  const [pos,         setPos]         = useState<Pos>({ x: 0, y: 0 });
  const [minimizado,  setMinimizado]  = useState(false);
  const [display,     setDisplay]     = useState("0");
  const [expressao,   setExpressao]   = useState("");
  const [historico,   setHistorico]   = useState<string[]>([]);
  const [copiado,     setCopiado]     = useState(false);
  const [arrastando,  setArrastando]  = useState(false);

  const janelRef    = useRef<HTMLDivElement>(null);
  const dragOffset  = useRef<Pos>({ x: 0, y: 0 });
  const posRef      = useRef<Pos>(pos); // ref para acesso em event listeners sem closure stale
  posRef.current    = pos;

  // Inicializa posição ao montar / abrir
  useEffect(() => {
    if (open) setPos(posicaoInicial());
  }, [open]);

  // ─── Drag (mouse) ──────────────────────────────────────────────────────────

  const onMouseMove = useCallback((e: MouseEvent) => {
    const novaPos = {
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    };
    // Limita ao viewport durante o drag
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
      salvarPosicao(snapped);
      return snapped;
    });
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup",   onMouseUp);
  }, [onMouseMove]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    // Ignora cliques em botões dentro da barra
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

  // ─── Drag (touch) ──────────────────────────────────────────────────────────

  const onTouchMove = useCallback((e: TouchEvent) => {
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
      salvarPosicao(snapped);
      return snapped;
    });
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend",  onTouchEnd);
  }, [onTouchMove]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const t = e.touches[0];
    dragOffset.current = {
      x: t.clientX - posRef.current.x,
      y: t.clientY - posRef.current.y,
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend",  onTouchEnd);
  }, [onTouchMove, onTouchEnd]);

  // Cleanup ao desmontar
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
      // Não captura quando o foco está em inputs de outras partes da página
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

  // ─── Botão da calculadora ──────────────────────────────────────────────────

  const BotaoCalc = ({
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

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      ref={janelRef}
      style={{
        position:  "fixed",
        left:      pos.x,
        top:       pos.y,
        width:     LARGURA,
        zIndex:    9999,
        // Sombra mais pronunciada para destacar do conteúdo
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
      }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden select-none"
    >
      {/* ── Barra de título (área de drag) ──────────────────────────────────── */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onTouchStart}
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700",
          "bg-gray-50 dark:bg-gray-900",
          arrastando ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Calculadora
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            onClick={copiarResultado}
            className="h-7 w-7"
            title="Copiar resultado"
          >
            {copiado
              ? <Check size={13} className="text-green-600" />
              : <Copy size={13} className="text-gray-500" />}
          </Button>
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

      {/* ── Corpo — oculto quando minimizado ────────────────────────────────── */}
      {!minimizado && (
        <div className="p-3">
          {/* Display */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3 mb-3">
            {expressao && (
              <div className="text-xs text-gray-400 dark:text-gray-500 text-right truncate mb-0.5">
                {expressao}
              </div>
            )}
            <div className="text-2xl font-bold text-right text-gray-900 dark:text-white break-all leading-tight">
              {display}
            </div>
          </div>

          {/* Grid de botões */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <BotaoCalc value="AC" variant="clear" />
            <BotaoCalc value="(" variant="operator" />
            <BotaoCalc value=")" variant="operator" />
            <BotaoCalc value="⌫" variant="operator" />

            <BotaoCalc value="7" />
            <BotaoCalc value="8" />
            <BotaoCalc value="9" />
            <BotaoCalc value="/" variant="operator" />

            <BotaoCalc value="4" />
            <BotaoCalc value="5" />
            <BotaoCalc value="6" />
            <BotaoCalc value="*" variant="operator" />

            <BotaoCalc value="1" />
            <BotaoCalc value="2" />
            <BotaoCalc value="3" />
            <BotaoCalc value="-" variant="operator" />

            <BotaoCalc value="0" />
            <BotaoCalc value="." />
            <BotaoCalc value="%" variant="operator" />
            <BotaoCalc value="+" variant="operator" />

            <BotaoCalc value="=" variant="equals" span={4} />
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