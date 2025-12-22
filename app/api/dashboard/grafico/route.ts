import { NextRequest, NextResponse } from 'next/server';
import { DashboardGraficoMeses } from '@/types/dashboard';

export async function GET(req: NextRequest) {
  const periodo = req.nextUrl.searchParams.get('periodo') || '2025-12';

  const dados: DashboardGraficoMeses = [
    { mes: 'Jul/25', receitas: 4000, despesas: 2500, balanco: 1500 },
    { mes: 'Ago/25', receitas: 4500, despesas: 2800, balanco: 1700 },
    { mes: 'Set/25', receitas: 4200, despesas: 3000, balanco: 1200 },
    { mes: 'Out/25', receitas: 4700, despesas: 3200, balanco: 1500 },
    { mes: 'Nov/25', receitas: 4800, despesas: 3100, balanco: 1700 },
    { mes: 'Dez/25', receitas: 5200, despesas: 3300, balanco: 1900 },
  ];

  return NextResponse.json(dados);
}
