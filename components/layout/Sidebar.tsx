"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, VisuallyHidden } from "@/components/ui/sheet";

import {
  BsHouse,
  BsArrowLeftRight,
  BsBank,
  BsTags,
  BsCreditCard,
  BsFillGearFill,
  BsShop, // Ícone para Estabelecimentos
  BsPiggyBank, // ✅ NOVO: ícone para Aplicações
} from "react-icons/bs";
import { MdOutlineAutoGraph } from "react-icons/md";
import { Menu, ChevronRight } from "lucide-react";
import type { IconType } from "react-icons";
import { LogoMarca } from "@/components/common/LogoMarca";
import { useIndicadorDeslizante } from "@/hooks/useIndicadorDeslizante";

/**
 * Pílula azul que desliza (400 ms) até o link ativo do menu. Fica dentro do contêiner dos links
 * (position: relative) e mede o link marcado com data-ativo. Sem link ativo (Perfil,
 * Notificações), some; ao reaparecer, nasce no lugar em vez de deslizar de onde estava.
 * Até ser posicionada, o próprio link ativo pinta o fundo (ver linkClasses).
 */
function IndicadorNavAtivo({ chave }: { chave: string }) {
  const ref = useIndicadorDeslizante({ chave, seletorItens: "a[data-ativo]", seletorAtivo: 'a[data-ativo="true"]' });

  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={{ opacity: 0 }}
      className="pointer-events-none absolute left-0 top-0 z-0 rounded-lg bg-blue-600 shadow-sm shadow-blue-950/40 data-[animar=true]:transition-[transform,width,height] data-[animar=true]:duration-[400ms] data-[animar=true]:ease-[cubic-bezier(0.22,1,0.36,1)]"
    />
  );
}

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar = ({ isCollapsed }: SidebarProps) => {
  const { data: userData, isLoading: loading } = useProfile();

  const [fotoError,   setFotoError]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [isHovered,   setIsHovered]   = useState(false);
  // Item clicado enquanto a página nova ainda não assumiu o endereço: a pílula já vai
  // até ele no clique, em vez de esperar a navegação terminar
  const [destino,     setDestino]     = useState<string | null>(null);
  const pathname = usePathname();
  const router   = useRouter();


  const isExpanded = !isCollapsed || isHovered;

  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [pathname];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    setMobileOpen(false);
    setDestino(null);
  }

  const isActive = (href: string) => {
    if (destino) return href === destino;
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const linkClasses = (href: string) => {
    const base   = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 relative z-10 group";
    const estado = isActive(href)
      ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-950/40 group-data-[indicador-pronto=true]/nav:bg-transparent group-data-[indicador-pronto=true]/nav:shadow-none"
      : "text-slate-300 font-medium hover:bg-white/[0.06] hover:text-white";
    return `${base} ${estado}`;
  };

  const navigationGroups = [
    {
      title: "Principal",
      links: [
        { href: "/dashboard",  icon: BsHouse,         label: "Dashboard"     },
        { href: "/transacoes", icon: BsArrowLeftRight, label: "Movimentações" },
      ],
    },
    {
      title: "Financeiro",
      links: [
        { href: "/contas",           icon: BsBank,       label: "Contas"             },
        // ✅ ATUALIZADO: Aplicações agora é página independente, não mais
        // uma aba dentro de Contas
        { href: "/aplicacoes",       icon: BsPiggyBank,  label: "Aplicações"         },
        { href: "/cartoes",          icon: BsCreditCard, label: "Cartões"            },
        { href: "/categorias",       icon: BsTags,       label: "Categorias"         },
        { href: "/estabelecimentos", icon: BsShop,       label: "Estabelecimentos"   },
      ],
    },
  ];

  const renderNavLink = ({
    href,
    icon: Icon,
    label,
    isMobile = false,
  }: {
    href: string;
    icon: IconType;
    label: string;
    isMobile?: boolean;
  }) => {
    const content = (
      <Link
        href={href}
        className={linkClasses(href)}
        data-ativo={isActive(href) ? "true" : "false"}
        onClick={(e) => {
          // Só clique simples: com Ctrl/Cmd/Shift ou botão do meio abre em outra aba
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          if (!isActive(href)) setDestino(href);
          // No celular, o menu já começa a fechar (deslizando) enquanto a página nova carrega
          if (isMobile) setMobileOpen(false);
        }}
      >
        <Icon size={18} className="flex-shrink-0" />
        <span
          className={`
            whitespace-nowrap
            transition-all duration-300
            ${isExpanded || isMobile
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4 absolute pointer-events-none"
            }
          `}
        >
          {label}
        </span>
      </Link>
    );

    if (isCollapsed && !isHovered && !isMobile) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  const renderUserProfileCard = ({ isMobile = false }: { isMobile?: boolean }) => {
    const getInitials = () => {
      if (userData?.name) {
        return userData.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      }
      return userData?.email?.[0]?.toUpperCase() || "U";
    };

    const initials     = getInitials();
    const displayName  = userData?.name  || "Usuário";
    const displayEmail = userData?.email || "";

    const cardContent = (
      <button
        onClick={() => router.push("/perfil")}
        className={`
          w-full flex items-center p-3 overflow-hidden
          bg-white/[0.04] hover:bg-white/[0.08] border border-white/10
          rounded-lg transition-colors duration-150 group cursor-pointer
          ${isExpanded || isMobile ? "gap-3 justify-start" : "gap-0 justify-center"}
        `}
      >
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700">
            {loading ? (
              <div className="w-full h-full bg-blue-400 dark:bg-blue-600 animate-pulse" />
            ) : userData?.image && !fotoError ? (
              <img
                src={userData.image}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setFotoError(true)}
              />
            ) : (
              <span className="text-white font-bold text-sm">{initials}</span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full" />
        </div>

        <div
          className={`
            text-left overflow-hidden transition-all duration-300
            ${isExpanded || isMobile
              ? "opacity-100 max-w-[160px] flex-1 min-w-0"
              : "opacity-0 max-w-0 flex-none pointer-events-none"
            }
          `}
        >
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-3.5 bg-white/10 rounded w-24 animate-pulse" />
              <div className="h-2.5 bg-white/10 rounded w-32 animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold truncate text-white">{displayName}</p>
              {displayEmail && (
                <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
              )}
            </>
          )}
        </div>

        <div className={`transition-all duration-300 overflow-hidden flex-shrink-0 ${isExpanded || isMobile ? "max-w-[16px] opacity-100" : "max-w-0 opacity-0"}`}>
          <ChevronRight size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    );

    if (isCollapsed && !isHovered && !isMobile) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              <div className="text-left">
                <p className="font-semibold">{displayName}</p>
                {displayEmail && <p className="text-xs text-muted-foreground">{displayEmail}</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return cardContent;
  };

  const renderSidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className="mb-6 px-1">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <LogoMarca tamanho={36} className="shadow-sm transition-transform group-hover:scale-105" />
          <span
            className={`
              text-lg font-bold tracking-tight text-white whitespace-nowrap transition-all duration-300
              ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
            `}
          >
            MyExpenses
          </span>
        </Link>
      </div>

      {/* Navigation Groups (a pílula do link ativo desliza por cima deste contêiner) */}
      <div className="group/nav relative flex-1 flex flex-col gap-5 overflow-y-auto overflow-x-hidden">
        <IndicadorNavAtivo chave={destino ?? pathname} />
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <p
              className={`
                text-[11px] font-semibold text-slate-500
                uppercase tracking-wider mb-1.5 px-3 transition-all duration-300
                ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
              `}
            >
              {group.title}
            </p>
            <div className="flex flex-col gap-1">
              {group.links.map((link) => (
                <Fragment key={link.href}>{renderNavLink({ ...link, isMobile })}</Fragment>
              ))}
            </div>
          </div>
        ))}

        {/* Análise na sequência dos grupos; Ajustes fica embaixo, junto do perfil */}
        <div className="flex flex-col gap-1">
          <p
            className={`
              text-[11px] font-semibold text-slate-500
              uppercase tracking-wider mb-1.5 px-3 transition-all duration-300
              ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
            `}
          >
            Análise
          </p>
          {renderNavLink({ href: "/resumo-anual", icon: MdOutlineAutoGraph, label: "Resumo Anual", isMobile })}
        </div>

        <div className="mt-auto border-t border-white/10 pt-3">
          {renderNavLink({ href: "/ajustes", icon: BsFillGearFill, label: "Ajustes", isMobile })}
        </div>
      </div>

      {/* User Profile Card */}
      <div className="mt-3">
        {renderUserProfileCard({ isMobile })}
      </div>
    </>
  );

  return (
    <>
      {isCollapsed && isHovered && (
        <div
          className="hidden md:block fixed inset-0 bg-black/10 backdrop-blur-[1px] z-30"
          onClick={() => setIsHovered(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <nav
        className={`
          hidden md:flex fixed top-0 left-0 h-screen
          bg-slate-900 text-slate-300
          p-4 flex-col
          transition-all duration-300 z-40
          border-r border-slate-800
          overflow-x-hidden
          ${isExpanded ? "w-64" : "w-20"}
          ${isCollapsed && isHovered ? "shadow-xl" : ""}
        `}
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {renderSidebarContent({ isMobile: false })}
      </nav>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            arrastarParaFechar
            className="
              w-64 p-4
              bg-slate-900 text-slate-300
              border-r border-slate-800
              [&>button]:hidden
            "
          >
            <VisuallyHidden>
              <SheetTitle>Menu de Navegação</SheetTitle>
            </VisuallyHidden>
            {/* Arrastar para a esquerda fecha o menu (arrastarParaFechar, no SheetContent) */}
            <div className="flex flex-col h-full relative">
              {renderSidebarContent({ isMobile: true })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default Sidebar;