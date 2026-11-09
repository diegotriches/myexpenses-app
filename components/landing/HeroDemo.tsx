"use client";

//
// Showcase de vídeo em destaque no Hero da landing — moldura de "janela
// de app" com um seletor pra alternar entre demos (Dashboard / Nova
// Movimentação). Espera os arquivos de vídeo em public/videos/.

import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, PlusCircle } from "lucide-react";

type DemoKey = "dashboard" | "movimentacao";

const DEMOS: { key: DemoKey; label: string; icon: typeof LayoutDashboard; src: string; poster: string }[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    src: "/videos/demo-dashboard.mp4",
    poster: "/videos/demo-dashboard-poster.png",
  },
  {
    key: "movimentacao",
    label: "Nova Movimentação",
    icon: PlusCircle,
    src: "/videos/demo-movimentacao.mp4",
    poster: "/videos/demo-movimentacao-poster.png",
  },
];

export default function HeroDemo() {
  const [ativo, setAtivo] = useState<DemoKey>("dashboard");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reinicia e toca do início sempre que troca de demo — evita o corte
  // estranho de retomar no meio de um clipe diferente
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {
      // autoplay pode ser bloqueado antes de qualquer interação do
      // usuário em alguns navegadores — silenciosamente ignora, o
      // poster continua visível
    });
  }, [ativo]);

  const demoAtual = DEMOS.find((d) => d.key === ativo)!;

  return (
    <div className="w-full max-w-xl mx-auto lg:mx-0">
      {/* Seletor de demo */}
      <div className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm p-1 rounded-full border border-white/20 mb-4">
        {DEMOS.map((demo) => {
          const Icon = demo.icon;
          const selecionado = demo.key === ativo;
          return (
            <button
              key={demo.key}
              onClick={() => setAtivo(demo.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selecionado
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={15} />
              {demo.label}
            </button>
          );
        })}
      </div>

      {/* Moldura estilo janela de app */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-gray-900">
        <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800/80 border-b border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          <span className="ml-3 text-xs text-gray-400 font-mono truncate">
            myexpenses-app-ten.vercel.app
          </span>
        </div>
        <div className="relative aspect-video bg-gray-950">
          <video
            ref={videoRef}
            key={demoAtual.key}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            poster={demoAtual.poster}
          >
            <source src={demoAtual.src} type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
}