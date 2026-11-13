"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast as ToastType, useToast } from "@/hooks/use-toast";

const SAIDA_MS = 200;
// Distância (px) do arraste que fecha o aviso; abaixo disso ele volta ao lugar
const LIMIAR_LATERAL = 80;
const LIMIAR_CIMA = 40;
// Só vira arraste depois de mexer alguns px: um toque simples no botão continua sendo clique
const INICIO_ARRASTE = 6;

type Saida = "direita" | "esquerda" | "cima" | "sumir";

const transformSaida: Record<Saida, string> = {
  direita: "translateX(110%)",
  esquerda: "translateX(-110%)",
  cima: "translateY(-120%)",
  sumir: "scale(0.96)",
};

export function Toast({ toast }: { toast: ToastType }) {
  const { dismiss } = useToast();
  const [saida, setSaida] = React.useState<Saida | null>(null);
  const [mouseSobre, setMouseSobre] = React.useState(false);
  const [tocando, setTocando] = React.useState(false);
  const [deslocamento, setDeslocamento] = React.useState<{ x: number; y: number } | null>(null);
  const inicio = React.useRef<{ x: number; y: number; arrastando: boolean } | null>(null);
  const restante = React.useRef(toast.duration ?? 5000);

  const fechar = React.useCallback(
    (direcao: Saida) => {
      setSaida(direcao);
      setTimeout(() => dismiss(toast.id), SAIDA_MS);
    },
    [dismiss, toast.id]
  );

  // Fecha sozinho no fim do tempo; enquanto o usuário toca ou passa o mouse,
  // o relógio para e retoma de onde estava
  const pausado = mouseSobre || tocando;
  React.useEffect(() => {
    if (pausado || saida || !Number.isFinite(restante.current)) return;
    const comeco = Date.now();
    const timer = setTimeout(() => fechar("sumir"), Math.max(restante.current, 0));
    return () => {
      clearTimeout(timer);
      restante.current -= Date.now() - comeco;
    };
  }, [pausado, saida, fechar]);

  const aoPressionar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (saida) return;
    inicio.current = { x: e.clientX, y: e.clientY, arrastando: false };
    setTocando(true);
  };

  const aoMover = (e: React.PointerEvent<HTMLDivElement>) => {
    const i = inicio.current;
    if (!i) return;
    const dx = e.clientX - i.x;
    const dy = e.clientY - i.y;
    if (!i.arrastando) {
      if (Math.hypot(dx, dy) < INICIO_ARRASTE) return;
      i.arrastando = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // Para baixo não fecha: o aviso só resiste um pouco
    setDeslocamento({ x: dx, y: dy < 0 ? dy : dy / 4 });
  };

  const aoSoltar = () => {
    const i = inicio.current;
    inicio.current = null;
    setTocando(false);
    if (!i?.arrastando || !deslocamento) return;
    const { x, y } = deslocamento;
    if (Math.abs(x) >= LIMIAR_LATERAL && Math.abs(x) > Math.abs(y)) fechar(x > 0 ? "direita" : "esquerda");
    else if (-y >= LIMIAR_CIMA) fechar("cima");
    setDeslocamento(null);
  };

  const estilo: React.CSSProperties = saida
    ? { transform: transformSaida[saida], opacity: 0 }
    : deslocamento
      ? {
          transform: `translate(${deslocamento.x}px, ${deslocamento.y}px)`,
          opacity: Math.max(1 - Math.abs(deslocamento.x) / 250 - Math.max(-deslocamento.y, 0) / 120, 0.2),
          transition: "none",
        }
      : {};

  const destrutivo = toast.variant === "destructive";

  return (
    // A animação de entrada fica no invólucro: no próprio aviso ela brigaria
    // com o transform do arraste
    <div className="w-full motion-safe:animate-toast-in">
      <div
        role={destrutivo ? "alert" : "status"}
        aria-live={destrutivo ? "assertive" : "polite"}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onPointerEnter={(e) => e.pointerType === "mouse" && setMouseSobre(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setMouseSobre(false)}
        style={{ ...estilo, touchAction: "none" }}
        className={cn(
          "group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg border p-4 pr-11 shadow-lg select-none sm:p-6 sm:pr-10",
          "pointer-events-auto transition-[transform,opacity] duration-200 ease-out",
          saida && "pointer-events-none",
          destrutivo
            ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100"
            : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
        )}
      >
        <div className="grid gap-1 flex-1">
          {toast.title && (
            <div className="text-sm font-semibold">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90">{toast.description}</div>
          )}
        </div>
        {toast.action}
        <button
          type="button"
          aria-label="Fechar aviso"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => fechar("sumir")}
          className={cn(
            "absolute right-1.5 top-1.5 rounded-md p-2 opacity-60 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 sm:right-2 sm:top-2 sm:p-1",
            destrutivo
              ? "text-red-600 hover:text-red-700 focus-visible:ring-red-400 dark:text-red-300"
              : "text-gray-500 hover:text-gray-700 focus-visible:ring-gray-400 dark:text-gray-400 dark:hover:text-gray-300"
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
