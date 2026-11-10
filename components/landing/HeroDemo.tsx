"use client";

//
// Demonstração em vídeo no Hero da landing: moldura de "janela de app" com um
// seletor entre as demos. Os vídeos ficam em public/videos/.
//  - Só baixa o vídeo quando ele entra na tela (preload="none" até lá).
//  - Pausa ao sair da tela e tem botão de pausar/tocar (vídeo em loop precisa
//    poder ser parado).
//  - Com "reduzir movimento" ligado no sistema, não toca sozinho (o botão ainda toca).

import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Pause, Play, PlusCircle } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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

export default function HeroDemo({ dominio }: { dominio: string }) {
  const [ativo, setAtivo] = useState<DemoKey>("dashboard");
  const [visivel, setVisivel] = useState(false);
  // "auto": toca na tela, salvo com "reduzir movimento"; o botão vira escolha explícita
  const [escolha, setEscolha] = useState<"auto" | "tocar" | "pausar">("auto");
  const reduzirMovimento = useMediaQuery("(prefers-reduced-motion: reduce)");
  const moldura = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Observa se a demo está na tela
  useEffect(() => {
    const el = moldura.current;
    if (!el) return;
    const observador = new IntersectionObserver(([entrada]) => setVisivel(entrada.isIntersecting), { threshold: 0.25 });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const deveTocar = visivel && (escolha === "tocar" || (escolha === "auto" && !reduzirMovimento));

  // Toca ou pausa conforme a visibilidade e a escolha do usuário; ao trocar de demo, começa do início
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (deveTocar) {
      video.play().catch(() => {
        // O navegador pode bloquear a reprodução automática: o poster continua visível
      });
    } else {
      video.pause();
    }
  }, [deveTocar, ativo]);

  const demoAtual = DEMOS.find((d) => d.key === ativo) ?? DEMOS[0];
  const tocando = deveTocar;

  return (
    <div className="w-full max-w-xl mx-auto lg:mx-0">
      {/* Seletor de demo */}
      <div className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm p-1 rounded-full border border-white/20 mb-4" role="tablist" aria-label="Demonstrações">
        {DEMOS.map((demo) => {
          const Icon = demo.icon;
          const selecionado = demo.key === ativo;
          return (
            <button
              key={demo.key}
              type="button"
              role="tab"
              aria-selected={selecionado}
              onClick={() => setAtivo(demo.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selecionado ? "bg-white text-blue-700 shadow-sm" : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={15} />
              {demo.label}
            </button>
          );
        })}
      </div>

      {/* Moldura estilo janela de app */}
      <div ref={moldura} className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-gray-900">
        <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800/80 border-b border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          <span className="ml-3 text-xs text-gray-400 font-mono truncate">{dominio}</span>
        </div>
        <div className="relative aspect-video bg-gray-950">
          <video
            ref={videoRef}
            key={demoAtual.key}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            preload={visivel ? "auto" : "none"}
            poster={demoAtual.poster}
            aria-label={`Demonstração: ${demoAtual.label}`}
          >
            <source src={demoAtual.src} type="video/mp4" />
          </video>

          <button
            type="button"
            onClick={() => setEscolha(tocando ? "pausar" : "tocar")}
            className="absolute bottom-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
            aria-label={tocando ? "Pausar demonstração" : "Tocar demonstração"}
          >
            {tocando ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
