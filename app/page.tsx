// Página pública: apresentação do app e portfólio do projeto.
// Renderizada no servidor; só o tema e a demonstração em vídeo rodam no navegador.
// Quem já tem sessão é levado ao dashboard pelo proxy.ts, antes de a página carregar.

import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChartCandlestick,
  Clock,
  CreditCard,
  Database,
  DatabaseBackup,
  Github,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  PiggyBank,
  Receipt,
  Repeat,
  Server,
  ShieldCheck,
  TestTubeDiagonal,
  Wallet,
} from "lucide-react";
import HeroDemo from "@/components/landing/HeroDemo";
import ThemeToggle from "@/components/landing/ThemeToggle";
import { LogoMarca } from "@/components/common/LogoMarca";

const DESCRICAO =
  "Projeto pessoal de finanças: contas, cartões, investimentos e o imposto de renda da bolsa em um só lugar. Next.js 16, TypeScript e Postgres.";

export const metadata: Metadata = {
  title: "MyExpenses: finanças pessoais",
  description: DESCRICAO,
  openGraph: {
    title: "MyExpenses",
    description: DESCRICAO,
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyExpenses",
    description: DESCRICAO,
  },
};

const GITHUB_PERFIL = "https://github.com/diegotriches";

// Domínio mostrado na moldura da demonstração
function dominioDoApp(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").host || "myexpenses";
  } catch {
    return "myexpenses";
  }
}

const FUNCIONALIDADES: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: Wallet,
    titulo: "Contas e extrato",
    texto: "Saldo por conta, extrato com o saldo após cada lançamento e transferências entre contas.",
  },
  {
    icone: Repeat,
    titulo: "Lançamentos",
    texto: "Receitas e despesas à vista, parceladas ou recorrentes, geradas automaticamente todo mês.",
  },
  {
    icone: CreditCard,
    titulo: "Cartões e faturas",
    texto: "Ciclo pelo dia de fechamento, limite disponível, pagamento, adiantamento, estorno e antecipação de parcelas.",
  },
  {
    icone: PiggyBank,
    titulo: "Renda fixa",
    texto: "Aplicações no CDI ou na Selic, com as taxas do Banco Central, IR regressivo por aporte e resgate no vencimento.",
  },
  {
    icone: ChartCandlestick,
    titulo: "Renda variável",
    texto: "Ações, FIIs, ETFs e BDRs com preço médio, day trade, eventos corporativos, proventos e cotações automáticas.",
  },
  {
    icone: Receipt,
    titulo: "IR da bolsa",
    texto: "Apuração mensal, isenção até R$ 20 mil, compensação de prejuízo, DARF com vencimento e bens e direitos.",
  },
  {
    icone: LayoutDashboard,
    titulo: "Dashboard",
    texto: "Gráficos mensais, gastos por categoria, evolução do saldo e resumo anual exportável em PDF.",
  },
  {
    icone: DatabaseBackup,
    titulo: "Meus dados",
    texto: "Backup automático, exportação e importação completas e a opção de ocultar os valores da tela.",
  },
];

const STACK: { icone: LucideIcon; titulo: string; itens: string[] }[] = [
  { icone: Layers, titulo: "Interface", itens: ["Next.js 16 (App Router)", "React 19", "Tailwind CSS v4 e shadcn/ui", "React Query v5", "Recharts"] },
  { icone: Server, titulo: "Servidor", itens: ["Route Handlers do Next", "NextAuth v4 (Google e senha)", "Drizzle ORM", "Vercel Cron e Blob", "Nodemailer"] },
  { icone: Database, titulo: "Dados", itens: ["PostgreSQL no Neon", "Transações com bloqueio de linha", "Scripts SQL versionados", "Taxas do BCB e cotações da brapi"] },
  { icone: TestTubeDiagonal, titulo: "Qualidade", itens: ["TypeScript estrito, sem any", "ESLint", "Vitest nas regras de cálculo", "CI no GitHub Actions"] },
];

const DESTAQUES: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: LockKeyhole,
    titulo: "Dinheiro sem condição de corrida",
    texto: "Toda alteração de saldo roda numa transação com a conta travada: um clique duplo não paga a fatura duas vezes.",
  },
  {
    icone: ShieldCheck,
    titulo: "Dados isolados por usuário",
    texto: "Cada consulta filtra pelo dono, e todo id vindo do navegador tem o dono conferido antes de qualquer escrita.",
  },
  {
    icone: TestTubeDiagonal,
    titulo: "Regras testadas",
    texto: "Ciclo de fatura, divisão de parcelas, IR regressivo, preço médio, day trade e DARF são funções puras com testes.",
  },
  {
    icone: Clock,
    titulo: "Rotinas automáticas",
    texto: "Crons diários geram recorrências, movem créditos de fatura, recalculam aplicações, atualizam cotações e fazem backup.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-40 bg-blue-700/85 dark:bg-gray-950/85 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white">
            <LogoMarca tamanho={30} className="ring-1 ring-white/40 shadow-md" />
            <span className="font-bold text-lg">MyExpenses</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a href="#funcionalidades" className="hidden md:inline px-3 py-2 text-sm text-blue-100 hover:text-white">
              Funcionalidades
            </a>
            <a href="#tecnologia" className="hidden md:inline px-3 py-2 text-sm text-blue-100 hover:text-white">
              Como foi feito
            </a>
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 rounded-full bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl motion-safe:animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl motion-safe:animate-pulse [animation-delay:1s]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-20 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
            <div className="text-center lg:text-left text-white space-y-6">
              <p className="motion-safe:animate-fade-in-up inline-block text-xs font-semibold uppercase tracking-widest text-blue-100 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                Projeto pessoal e portfólio
              </p>
              <h1 className="motion-safe:animate-fade-in-up text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                Minhas finanças,
                <br />
                <span className="bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                  em um só lugar
                </span>
              </h1>
              <p className="motion-safe:animate-fade-in-up [animation-delay:150ms] text-lg md:text-xl text-blue-100 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Contas, cartões, investimentos e o imposto de renda da bolsa, com as regras que eu uso no dia a dia.
                Construído para o meu controle financeiro e aberto aqui como portfólio.
              </p>
              <div className="motion-safe:animate-fade-in-up [animation-delay:300ms] flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-blue-700 font-bold rounded-full hover:bg-blue-50 transition-colors shadow-xl"
                >
                  Entrar
                  <ArrowRight size={20} className="motion-safe:group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#tecnologia"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-colors border border-white/30"
                >
                  Ver como foi feito
                </a>
              </div>
              <ul className="motion-safe:animate-fade-in-up [animation-delay:450ms] flex flex-wrap justify-center lg:justify-start gap-2 pt-2 text-xs text-blue-100">
                {["Next.js 16", "React 19", "TypeScript", "PostgreSQL", "Drizzle", "Vitest"].map((t) => (
                  <li key={t} className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15">{t}</li>
                ))}
              </ul>
            </div>

            <div className="motion-safe:animate-fade-in-up [animation-delay:300ms]">
              <HeroDemo dominio={dominioDoApp()} />
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="scroll-mt-16 py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">O que o app faz</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Do lançamento do dia a dia ao DARF da bolsa, com as regras de cada módulo calculadas no próprio app.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FUNCIONALIDADES.map(({ icone: Icone, titulo, texto }) => (
              <div
                key={titulo}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center mb-4">
                  <Icone className="text-white" size={22} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">{titulo}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como foi feito */}
      <section id="tecnologia" className="scroll-mt-16 py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">Como foi feito</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Uma aplicação full stack em TypeScript, com o cuidado que dinheiro exige.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {STACK.map(({ icone: Icone, titulo, itens }) => (
              <div key={titulo} className="p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2.5 mb-4">
                  <Icone className="text-blue-600 dark:text-blue-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{titulo}</h3>
                </div>
                <ul className="space-y-2">
                  {itens.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {DESTAQUES.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="flex gap-4 p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                  <Icone className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{titulo}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="py-10 bg-gray-900 dark:bg-black text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <LogoMarca tamanho={22} />
            <span className="font-semibold text-gray-200">MyExpenses</span>
            <span className="text-sm text-gray-500">· projeto pessoal</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/contato" className="hover:text-gray-200 transition-colors">Contato</Link>
            <Link href="/privacy" className="hover:text-gray-200 transition-colors">Privacidade</Link>
            <Link href="/terms" className="hover:text-gray-200 transition-colors">Termos de uso</Link>
            <a
              href={GITHUB_PERFIL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-gray-200 transition-colors"
            >
              <Github size={16} />
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
